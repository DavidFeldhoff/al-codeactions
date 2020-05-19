import * as vscode from 'vscode';
import { ALVariable } from "../Entities/alVariable";
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { DocumentUtils } from '../documentUtils';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from '../AL Code Outline Ext/syntaxTreeExt';

export class ALVariableParser {
    
    static async parseVariableTreeNodeArrayToALVariableArray(document: vscode.TextDocument, variableTreeNodes: ALFullSyntaxTreeNode[]): Promise<ALVariable[]> {
        let alVariables: ALVariable[] = [];
        for(let i= 0; i < variableTreeNodes.length;i++){
            switch (variableTreeNodes[i].kind) {
                case FullSyntaxTreeNodeKind.getVariableDeclaration():
                    alVariables.push(await this.parseVariableDeclarationTreeNodeToALVariable(document, variableTreeNodes[i]));
                    break;
                case FullSyntaxTreeNodeKind.getVariableDeclarationName():
                    alVariables.push(await this.parseVariableDeclarationNameTreeNodeToALVariable(document, variableTreeNodes[i]));
                    break;
                default:
                    throw new Error('Variable should be one of the above kinds.');
            }
        }
        return alVariables;
    }
    static async parseVariableDeclarationTreeNodeToALVariable(document: vscode.TextDocument, variableDeclarationTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable> {
        if (!variableDeclarationTreeNode.kind || variableDeclarationTreeNode.kind !== FullSyntaxTreeNodeKind.getVariableDeclaration()) {
            throw new Error('That\'s not a variable declaration tree node.');
        }
        if (variableDeclarationTreeNode.childNodes) {
            let identifierTreeNode: ALFullSyntaxTreeNode = variableDeclarationTreeNode.childNodes[0];
            let rangeOfName: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = variableDeclarationTreeNode.childNodes[1];
            let rangeOfType: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            return new ALVariable(identifierName, methodOrTriggerTreeNode?.name, false, type);
        } else {
            throw new Error('Variable declaration has no child nodes.');
        }
    }
    static async parseVariableDeclarationNameTreeNodeToALVariable(document: vscode.TextDocument, declarationNameTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable> {
        if (!declarationNameTreeNode.kind || declarationNameTreeNode.kind !== FullSyntaxTreeNodeKind.getVariableDeclarationName()) {
            throw new Error('That\'s not a variable declaration name tree node.');
        }
        if (declarationNameTreeNode.parentNode && declarationNameTreeNode.parentNode.childNodes) {
            let rangeOfName: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(declarationNameTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = declarationNameTreeNode.parentNode.childNodes[declarationNameTreeNode.parentNode.childNodes.length - 1];
            let rangeOfType: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            return new ALVariable(identifierName, methodOrTriggerTreeNode?.name, false, type);
        } else {
            throw new Error('Variable declaration has no parent node.');
        }
    }
    static async parseReturnValueTreeNodeToALVariable(document: vscode.TextDocument, returnVariableTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable> {
        if (!returnVariableTreeNode.kind || returnVariableTreeNode.kind !== FullSyntaxTreeNodeKind.getReturnValue()) {
            throw new Error('That\'s not a return value tree node.');
        }
        if (returnVariableTreeNode.childNodes && returnVariableTreeNode.childNodes.length === 2) {
            let identifierTreeNode: ALFullSyntaxTreeNode = returnVariableTreeNode.childNodes[0];
            let rangeOfName: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = returnVariableTreeNode.childNodes[1];
            let rangeOfType: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            return new ALVariable(identifierName, methodOrTriggerTreeNode?.name, false, type);
        } else {
            throw new Error('Variable declaration has no child nodes.');
        }
    }
}