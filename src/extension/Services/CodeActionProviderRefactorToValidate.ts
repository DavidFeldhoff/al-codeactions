import { CodeAction, CodeActionKind, commands, Location, Position, Range, TextDocument, workspace, WorkspaceEdit } from "vscode";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { DocumentUtils } from "../Utils/documentUtils";
import { ICodeActionProvider } from "./ICodeActionProvider";

export class CodeActionProviderRefactorToValidate implements ICodeActionProvider {
    document: TextDocument;
    range: Range;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    
    async considerLine(): Promise<boolean> {
        if (this.range.start.compareTo(this.range.end) == 0) {
            let word1: string = this.document.getText(new Range(this.range.start.translate(0, 0), this.range.start.translate(0, 2)));
            let word2: string = this.document.getText(new Range(this.range.start.translate(0, -1), this.range.start.translate(0, 1)));
            let word3: string = this.document.getText(new Range(this.range.start.translate(0, -2), this.range.start.translate(0, 0)));
            if ([word1, word2, word3].includes(':=')) {
                return true;
            }
            return false;
        } else {
            if (this.range.start.line == this.range.end.line) {
                return this.document.getText(this.range).includes(':=');
            } else {
                let eachLineContainsAssignment: boolean = true;
                for (let line = this.range.start.line; line <= this.range.end.line; line++) {
                    if (!this.document.lineAt(line).text.includes(':=') && !this.document.lineAt(line).isEmptyOrWhitespace)
                        eachLineContainsAssignment = false;
                }
                return eachLineContainsAssignment;
            }
        }
    }
    async createCodeActions(): Promise<CodeAction[]> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);

        let edit: WorkspaceEdit = new WorkspaceEdit();
        if (this.range.start.compareTo(this.range.end) == 0) {
            let assignmentTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]);
            await this.changeAssignmentToValidateExpression(assignmentTreeNode, edit);
        } else {
            if (this.range.start.line == this.range.end.line) {
                let posFound: number = this.document.getText(this.range).indexOf(':=') + this.range.start.character;
                let assignmentTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(new Position(this.range.start.line, posFound), [FullSyntaxTreeNodeKind.getAssignmentStatement()]);
                await this.changeAssignmentToValidateExpression(assignmentTreeNode, edit);
            } else {
                for (let line = this.range.start.line; line <= this.range.end.line; line++) {
                    if (this.document.lineAt(line).isEmptyOrWhitespace)
                        continue;
                    let posFound: number = this.document.lineAt(line).text.indexOf(':=');
                    let assignmentTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(new Position(line, posFound), [FullSyntaxTreeNodeKind.getAssignmentStatement()]);
                    await this.changeAssignmentToValidateExpression(assignmentTreeNode, edit);
                }
            }
        }
        if (edit.entries().length > 0) {
            let codeAction: CodeAction = new CodeAction('Refactor to Validate-Statement', CodeActionKind.RefactorInline);
            codeAction.edit = edit;
            return [codeAction];
        } else {
            return [];
        }
    }
    async changeAssignmentToValidateExpression(assignmentTreeNode: ALFullSyntaxTreeNode | undefined, edit: WorkspaceEdit): Promise<void> {
        if (!assignmentTreeNode || !assignmentTreeNode.childNodes)
            return;
        let leftTreeNode: ALFullSyntaxTreeNode = assignmentTreeNode.childNodes[0];
        let rightTreeNode: ALFullSyntaxTreeNode = assignmentTreeNode.childNodes[1];
        let leftTreeNodeRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(leftTreeNode.fullSpan));
        let rightTreeNodeRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(rightTreeNode.fullSpan));
        let validatePosition: Position;
        if (leftTreeNode.kind == FullSyntaxTreeNodeKind.getIdentifierName()) {
            let location: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, leftTreeNodeRange.start)
            if (!location)
                return;
            let otherDocument: TextDocument = await workspace.openTextDocument(location[0].uri)
            let syntaxTreeOtherDoc: SyntaxTree = await SyntaxTree.getInstance(otherDocument);
            if (!syntaxTreeOtherDoc.findTreeNode(location[0].range.start, [FullSyntaxTreeNodeKind.getField()]))
                return;
            validatePosition = leftTreeNodeRange.start;
        } else {
            if (leftTreeNode.kind !== FullSyntaxTreeNodeKind.getMemberAccessExpression() || !leftTreeNode.childNodes)
                return;
            let fieldTreeNode: ALFullSyntaxTreeNode = leftTreeNode.childNodes[1];
            let fieldTreeNodeRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(fieldTreeNode.fullSpan));
            validatePosition = fieldTreeNodeRange.start
        }
        edit.insert(this.document.uri, rightTreeNodeRange.end, ')');
        edit.replace(this.document.uri, new Range(leftTreeNodeRange.end, rightTreeNodeRange.start), ', ');
        edit.insert(this.document.uri, validatePosition, 'Validate(');
    }
}