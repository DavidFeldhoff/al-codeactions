import * as vscode from 'vscode';
import { CodeAction, Range } from "vscode";
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ICodeActionProvider } from "./ICodeActionProvider";
import { Command } from '../Entities/Command';
import { DocumentUtils } from '../Utils/documentUtils';

export class CodeActionProviderExtractLabel implements ICodeActionProvider {
    range: vscode.Range;
    document: vscode.TextDocument;
    stringLiteralTreeNode: ALFullSyntaxTreeNode | undefined;
    syntaxTree: SyntaxTree | undefined;
    constructor(document: vscode.TextDocument, range: vscode.Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(): Promise<boolean> {
        let lineText: vscode.TextLine = this.document.lineAt(this.range.start.line);
        return lineText.text.includes('\'') && lineText.firstNonWhitespaceCharacterIndex > 4;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        this.stringLiteralTreeNode = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getStringLiteralValue()]);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (!this.stringLiteralTreeNode || !this.syntaxTree || !methodOrTriggerTreeNode)
            return [];
        let blockTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false);
        if (!blockTreeNode)
            return [];

        let stringLiteralRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(this.stringLiteralTreeNode.fullSpan));

        let codeAction: CodeAction = new CodeAction('Extract to Label', vscode.CodeActionKind.RefactorExtract);
        let variableName: string = 'newLabel';
        let edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
        edit.replace(this.document.uri, stringLiteralRange, variableName);
        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        let line: number | undefined;
        if (varSection) {
            let labels: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getLabelDataType(), true, labels);
            if (labels.length > 0) {
                labels = labels.sort((a, b) => a.fullSpan && b.fullSpan && a.fullSpan.start && b.fullSpan.start ? a.fullSpan.start.line - b.fullSpan.start.line : 0);
                let lastLabel: ALFullSyntaxTreeNode = labels[labels.length - 1];
                line = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(lastLabel.fullSpan)).end.line;
            }
        }
        if (!line) {
            line = TextRangeExt.createVSCodeRange(blockTreeNode.fullSpan).start.line - 1;
        }
        let positionToAddAfter: vscode.Position = new vscode.Position(line, this.document.lineAt(line).text.length)

        if (!varSection)
            edit.insert(this.document.uri, positionToAddAfter, '\r\n    var');
        edit.insert(this.document.uri, positionToAddAfter, '\r\n        ' + variableName + ': Label ' + this.document.getText(stringLiteralRange) + ';');
        let linesAdded: number = varSection ? 1 : 2;

        codeAction.edit = edit;
        codeAction.command = {
            command: Command.renameCommand,
            arguments: [new vscode.Location(this.document.uri, stringLiteralRange.start.translate(linesAdded))],
            title: 'Extract Label'
        };
        return [codeAction];
    }
}