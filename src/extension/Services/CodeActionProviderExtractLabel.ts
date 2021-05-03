import { CodeAction, CodeActionKind, Location, Range, TextDocument, TextEdit, TextLine, WorkspaceEdit } from "vscode";
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ICodeActionProvider } from "./ICodeActionProvider";
import { Command } from '../Entities/Command';
import { DocumentUtils } from '../Utils/documentUtils';
import { ALVariable } from '../Entities/alVariable';
import { WorkspaceEditUtils } from '../Utils/WorkspaceEditUtils';

export class CodeActionProviderExtractLabel implements ICodeActionProvider {
    range: Range;
    document: TextDocument;
    stringLiteralTreeNode: ALFullSyntaxTreeNode | undefined;
    syntaxTree: SyntaxTree | undefined;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(): Promise<boolean> {
        let lineText: TextLine = this.document.lineAt(this.range.start.line);
        return lineText.text.includes('\'') && lineText.firstNonWhitespaceCharacterIndex > 4;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        this.stringLiteralTreeNode = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getStringLiteralValue()]);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (!this.stringLiteralTreeNode || !this.syntaxTree || !methodOrTriggerTreeNode)
            return [];

        let stringLiteralRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(this.stringLiteralTreeNode.fullSpan));

        let variable: ALVariable = new ALVariable('newLabel', 'Label ' + this.document.getText(stringLiteralRange))
        let textEdit: TextEdit = WorkspaceEditUtils.addVariableToLocalVarSection(methodOrTriggerTreeNode, variable, this.document);

        let edit: WorkspaceEdit = new WorkspaceEdit();
        edit.replace(this.document.uri, stringLiteralRange, variable.name);
        edit.insert(this.document.uri, textEdit.range.start, textEdit.newText);
        let linesAdded: number = (textEdit.newText.length - textEdit.newText.replace(/\r\n/g, '').length) / 2;

        let codeAction: CodeAction = new CodeAction('Extract to Label', CodeActionKind.RefactorExtract);
        codeAction.edit = edit;
        codeAction.command = {
            command: Command.renameCommand,
            arguments: [new Location(this.document.uri, stringLiteralRange.start.translate(linesAdded))],
            title: 'Extract Label'
        };
        return [codeAction];
    }
}