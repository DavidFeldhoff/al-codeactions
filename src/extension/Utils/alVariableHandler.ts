import * as vscode from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALVariable } from '../Entities/alVariable';

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
                return new ALVariable(variableName, 'Record ' + document.getText(rangeOfTableNo), undefined, true).sanitizeName();
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTableObject());
        if (objects.length === 1) {
            let tableObject: ALFullSyntaxTreeNode = objects[0];
            let identifierList: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(tableObject, FullSyntaxTreeNodeKind.getIdentifierName(), false, identifierList);
            if (identifierList.length === 1 && identifierList[0].identifier) {
                return new ALVariable(variableName, 'Record ' + identifierList[0].identifier, undefined, true).sanitizeName();
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getPageObject());
        if (objects.length === 1) {
            let pageObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, pageObject, 'SourceTable');
            if (valueOfPropertyTreeNode) {
                let rangeOfSourceTable: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, 'Record ' + document.getText(rangeOfSourceTable), undefined, true).sanitizeName();
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getRequestPage());
        if (objects.length === 1) {
            let requestPageObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, requestPageObject, 'SourceTable');
            if (valueOfPropertyTreeNode) {
                let rangeOfSourceTable: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, 'Record ' + document.getText(rangeOfSourceTable), undefined, true).sanitizeName();
            }
        }
        return undefined;
    }
}