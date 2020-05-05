import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { ALVariable } from './alVariable';
import { ALVariableParser } from './alVariableParser';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';
import { promises } from 'dns';

export class ALVariableHandler {
    private variables: ALVariable[] = [];
    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }

    public async search() {
        this.variables = await ALVariableParser.findAllVariablesInDocument(this.document);
    }

    public getAllVariables(): ALVariable[] {
        return this.variables;
    }
    public getALVariableByName(variableName: string, procedureName?: string): ALVariable | undefined {
        if (!isUndefined(procedureName)) {
            let localVariable = this.getLocalVariableByName(procedureName, variableName);
            if (!isUndefined(localVariable)) {
                return localVariable;
            }
        }

        const globalVariable = this.getGlobalVariableByName(variableName);
        if (!isUndefined(globalVariable)) {
            return globalVariable;
        }
        return undefined;
    }
    public static async getALVariableByName(document: vscode.TextDocument, variableRange: vscode.Range): Promise<ALVariable | undefined> {
        let variableName: string = document.getText(variableRange);

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(variableRange.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (methodOrTriggerTreeNode) {
            let varSectionTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getVarSection(), false);
            if (varSectionTreeNode) {
                let variable: ALVariable | undefined = await this.getALVariableByNameSearchingInVarSection(document, variableName, varSectionTreeNode);
                if (variable) {
                    return variable;
                }
            }
        }
        let globalVarSectionTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(variableRange.start, [FullSyntaxTreeNodeKind.getGlobalVarSection()]);
        if (globalVarSectionTreeNode) {
            let variable: ALVariable | undefined = await this.getALVariableByNameSearchingInVarSection(document, variableName, globalVarSectionTreeNode);
            if (variable) {
                return variable;
            }
        }
    }
    private static async getALVariableByNameSearchingInVarSection(document: vscode.TextDocument, variableName: string, varSectionTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable | undefined> {
        let variableDeclarations: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSectionTreeNode, FullSyntaxTreeNodeKind.getVariableDeclaration(), false, variableDeclarations);
        for (let i = 0; i < variableDeclarations.length; i++) {
            let localVariableDeclaration: ALFullSyntaxTreeNode = variableDeclarations[i];
            if (localVariableDeclaration.childNodes && localVariableDeclaration.childNodes[0].kind === FullSyntaxTreeNodeKind.getIdentifierName() && localVariableDeclaration.childNodes[0].name) {
                let localVariableIdentifierName: string = localVariableDeclaration.childNodes[0].name;
                //Remove quotes if they are the first and last characters
                localVariableIdentifierName = localVariableIdentifierName.trim().toLowerCase().replace(/^"(.*)"$/, '$1');
                variableName = variableName.trim().toLowerCase().replace(/^"(.*)"$/, '$1');
                if (localVariableIdentifierName === variableName) {
                    return await ALVariableParser.parseVariableDeclarationToALVariable(document, localVariableDeclaration);
                }
            }
        }
        return undefined;
    }
    static async getRecAsALVariable(document: vscode.TextDocument): Promise<ALVariable | undefined> {
        let variableName = 'Rec';

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let objects: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getCodeunitObject());
        if (objects.length === 1) {
            let cuObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(cuObject, 'TableNo');
            if (valueOfPropertyTreeNode) {
                let rangeOfTableNo: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, undefined, true, document.getText(rangeOfTableNo));
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTableObject());
        if (objects.length === 1) {
            let tableObject: ALFullSyntaxTreeNode = objects[0];
            let identifierList: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(tableObject, FullSyntaxTreeNodeKind.getIdentifierName(), false, identifierList);
            if (identifierList.length === 1 && identifierList[0].name) {
                return new ALVariable(variableName, undefined, true, identifierList[0].name);
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getPageObject());
        if (objects.length === 1) {
            let pageObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(pageObject, 'SourceTable');
            if (valueOfPropertyTreeNode) {
                let rangeOfSourceTable: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, undefined, true, document.getText(rangeOfSourceTable));
            }
        }
        objects = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getRequestPage());
        if (objects.length === 1) {
            let cuObject: ALFullSyntaxTreeNode = objects[0];
            let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(cuObject, 'SourceTable');
            if (valueOfPropertyTreeNode) {
                let rangeOfSourceTable: vscode.Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                return new ALVariable(variableName, undefined, true, document.getText(rangeOfSourceTable));
            }
        }
        return undefined;
    }
    static hasQuotes(text: string): boolean {
        text = text.trim();
        return text.startsWith('"') && text.endsWith('"');
    }

    private getGlobalVariableByName(variableName: string) {
        return this.variables.find(v =>
            v.isLocal === false &&
            isUndefined(v.procedure) &&
            v.name === variableName);
    }

    private getLocalVariableByName(procedureName: string, variableName: string): ALVariable | undefined {
        let localVariable = this.variables.find(v =>
            v.isLocal === true &&
            v.procedure === procedureName &&
            v.name === variableName);
        return localVariable;
    }
}