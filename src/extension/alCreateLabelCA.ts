import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { RenameMgt } from './renameMgt';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';
import { SyntaxTreeExt } from './AL Code Outline Ext/syntaxTreeExt';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { DocumentUtils } from './documentUtils';

export class ALCreateLabelCA implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];


    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let stringLiteralTreeNodeOfStart: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(range.start, [FullSyntaxTreeNodeKind.getStringLiteralValue()]);
        let stringLiteralTreeNodeOfEnd: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(range.end, [FullSyntaxTreeNodeKind.getStringLiteralValue()]);
        if (!stringLiteralTreeNodeOfStart || !stringLiteralTreeNodeOfEnd) {
            return;
        }
        if (stringLiteralTreeNodeOfStart === stringLiteralTreeNodeOfEnd) {
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, range.start);
            if (methodOrTriggerTreeNode) {
                let blockTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false);
                if (blockTreeNode) {
                    let codeActionToCreateLabel: vscode.CodeAction | undefined;
                    codeActionToCreateLabel = await this.createCodeAction(document, DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(stringLiteralTreeNodeOfStart.fullSpan)));
                    if (isUndefined(codeActionToCreateLabel)) {
                        return;
                    } else {
                        return [codeActionToCreateLabel];
                    }
                }
            }
        }
    }

    private async createCodeAction(currentDocument: vscode.TextDocument, rangeOfString: vscode.Range): Promise<vscode.CodeAction | undefined> {
        let codeActionToCreateLabel: vscode.CodeAction | undefined = await this.createFixToCreateLabel(currentDocument, rangeOfString);

        if (isUndefined(codeActionToCreateLabel)) {
            return;
        } else {
            return codeActionToCreateLabel;
        }
    }

    private async createFixToCreateLabel(document: vscode.TextDocument, rangeOfString: vscode.Range): Promise<vscode.CodeAction | undefined> {
        const fix = new vscode.CodeAction(`Create Label`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();

        let position: vscode.Position = await this.getPositionToInsertLabel(document, rangeOfString);
        let textToInsert: string = await this.createVariableDeclarationLine(document, rangeOfString);
        if (!textToInsert || !position) {
            return;
        }

        fix.edit.insert(document.uri, position, textToInsert);
        fix.edit.replace(document.uri, rangeOfString, RenameMgt.newLabelName);
        fix.command = {
            command: 'alcodeactions.renameMethod',
            title: 'Extract Label'
        };
        return fix;
    }
    async getPositionToInsertLabel(document: vscode.TextDocument, rangeOfString: vscode.Range): Promise<vscode.Position> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfString.start) as ALFullSyntaxTreeNode;
        let blockTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false) as ALFullSyntaxTreeNode;
        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        if (!varSection) {
            let rangeOfBlockTreeNode: vscode.Range = TextRangeExt.createVSCodeRange(blockTreeNode.span);
            return new vscode.Position(rangeOfBlockTreeNode.start.line, 0);
        } else {
            let variableDeclarations: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableDeclaration(), false, variableDeclarations);
            ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableListDeclaration(), false, variableDeclarations);
            let labelVariables: ALFullSyntaxTreeNode[] = [];
            variableDeclarations.forEach(variableDeclaration => {
                if (variableDeclaration.childNodes) {
                    let typeTreeNode: ALFullSyntaxTreeNode = variableDeclaration.childNodes[variableDeclaration.childNodes.length - 1];
                    let rangeOfType: vscode.Range = TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan);
                    if (document.getText(rangeOfType).toLowerCase().startsWith('label')) {
                        labelVariables.push(variableDeclaration);
                    }
                }
            });

            let addVariableAfterTreeNode: ALFullSyntaxTreeNode;
            labelVariables = labelVariables.sort((a, b) => TextRangeExt.createVSCodeRange(a.span).start.compareTo(TextRangeExt.createVSCodeRange(b.span).start));
            variableDeclarations = variableDeclarations.sort((a, b) => TextRangeExt.createVSCodeRange(a.span).start.compareTo(TextRangeExt.createVSCodeRange(b.span).start));
            if (labelVariables.length > 0) {
                addVariableAfterTreeNode = labelVariables[labelVariables.length - 1];
            } else if (variableDeclarations.length > 0) {
                addVariableAfterTreeNode = variableDeclarations[variableDeclarations.length - 1];
            } else {
                addVariableAfterTreeNode = varSection;
            }
            let lastRange: vscode.Range = TextRangeExt.createVSCodeRange(addVariableAfterTreeNode.span);
            return new vscode.Position(lastRange.end.line + 1, 0);
        }
    }
    async createVariableDeclarationLine(document: vscode.TextDocument, rangeOfString: vscode.Range): Promise<string> {
        let variableDefinition = this.createVariableDefinition(RenameMgt.newLabelName, 'Label ' + document.getText(rangeOfString) + ';');

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfString.start) as ALFullSyntaxTreeNode;
        let blockTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false) as ALFullSyntaxTreeNode;
        let rangeOfBlockTreeNode: vscode.Range = TextRangeExt.createVSCodeRange(blockTreeNode.span);
        let spaces = document.lineAt(rangeOfBlockTreeNode.start.line).firstNonWhitespaceCharacterIndex;
        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        if (!varSection) {
            let varString: string = "".padStart(spaces, ' ') + 'var\r\n';
            varString += "".padStart(spaces + 4, ' ') + variableDefinition + '\r\n';
            return varString;
        } else {
            return "".padStart(spaces + 4, ' ') + variableDefinition + '\r\n';
        }
    }
    createVariableDefinition(variableName: string, variableType: string): string {
        return variableName + ': ' + variableType;
    }
}