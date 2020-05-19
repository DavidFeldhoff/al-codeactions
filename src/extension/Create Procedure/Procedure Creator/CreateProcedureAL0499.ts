import { ICreateProcedure } from './ICreateProcedure';
import * as vscode from 'vscode';
import { ALProcedure } from '../../Entities/alProcedure';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { ALVariable } from '../../Entities/alVariable';
import { ALObject } from '../../Entities/alObject';
import { SyntaxTreeExt } from '../../AL Code Outline Ext/syntaxTreeExt';
import { ALObjectParser } from '../../Entity Parser/alObjectParser';

export class CreateProcedureAL0449 implements ICreateProcedure {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    rangeOfProcedureName: vscode.Range;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
        if (!diagnostic.message) {
            throw new Error('Message has to be filled.');
        }
        let regExpMatch: RegExpMatchArray | null = diagnostic.message.match(/The handler function ([^\s]+) was not found./);
        if (!regExpMatch || !regExpMatch.groups) {
            throw new Error('Cannot extract FunctionName of Handler Function');
        }
        let functionName: string = regExpMatch.groups[0];
        let textOfDiagnostic: string = document.getText(diagnostic.range);
        let startPos: vscode.Position = diagnostic.range.start.translate(0, textOfDiagnostic.indexOf(functionName));
        this.rangeOfProcedureName = new vscode.Range(
            startPos, startPos.translate(0, functionName.length));
    }
    async initialize() {
        this.syntaxTree = await SyntaxTree.getInstance(this.document, true);
    }
    getProcedureName(): string {
        return this.document.getText(this.rangeOfProcedureName);
    }
    async createProcedureObject(): Promise<ALProcedure | undefined> {
        return;
    }
    isLocal(): boolean {
        return true;
    }
    async getVariables(): Promise<ALVariable[]> {
        return [];
    }
    async getParameters(): Promise<ALVariable[]> {
        //TestPage
        return [];
    }
    async getReturnType(): Promise<string | undefined> {
        return undefined;
    }
    async getObject(): Promise<ALObject> {
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(this.syntaxTree as SyntaxTree, this.diagnostic.range.start);
        if (!objectTreeNode) {
            throw new Error('Object Tree node has to be found.');
        }
        return ALObjectParser.parseObjectTreeNodeToALObject(this.document, objectTreeNode);
    }
}