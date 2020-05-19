import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { ALVariable } from './Entities/alVariable';
import { ALVariableParser } from './Entity Parser/alVariableParser';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';

export class ALVariableHandler {
    static async getRecAsALVariable(document: vscode.TextDocument, variableRange: vscode.Range): Promise<ALVariable | undefined> {
        let variableName = document.getText(variableRange); //Rec or xRec

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let objects: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getCodeunitObject());
        if (objects.length === 1) {
            let cuObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, cuObject, 'TableNo');
            if (valueOfPropertyTreeNode) {
                let rangeOfTableNo: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, undefined, true, 'Record ' + document.getText(rangeOfTableNo));
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTableObject());
        if (objects.length === 1) {
            let tableObject: ALFullSyntaxTreeNode = objects[0];
            let identifierList: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(tableObject, FullSyntaxTreeNodeKind.getIdentifierName(), false, identifierList);
            if (identifierList.length === 1 && identifierList[0].identifier) {
                return new ALVariable(variableName, undefined, true, 'Record ' + identifierList[0].identifier);
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getPageObject());
        if (objects.length === 1) {
            let pageObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, pageObject, 'SourceTable');
            if (valueOfPropertyTreeNode) {
                let rangeOfSourceTable: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, undefined, true, 'Record ' + document.getText(rangeOfSourceTable));
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getRequestPage());
        if (objects.length === 1) {
            let requestPageObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, requestPageObject, 'SourceTable');
            if (valueOfPropertyTreeNode) {
                let rangeOfSourceTable: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, undefined, true, 'Record ' + document.getText(rangeOfSourceTable));
            }
        }
        return undefined;
    }
}