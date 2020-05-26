import * as vscode from 'vscode';
import { SyntaxTreeExt } from '../../AL Code Outline Ext/syntaxTreeExt';
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { DocumentUtils } from '../../documentUtils';
import { ALObject } from '../../Entities/alObject';
import { ALVariable } from '../../Entities/alVariable';
import { ALObjectParser } from '../../Entity Parser/alObjectParser';
import { ICreateProcedure } from './ICreateProcedure';

export class CreateProcedureAL0499 implements ICreateProcedure {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    procedureName: string;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
        this.procedureName = DocumentUtils.getProcedureNameOfDiagnosticMessage(diagnostic.message);
    }
    async initialize() {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
    }
    getProcedureName(): string {
        return this.procedureName;
    }
    getMemberAttributes(): string[] {
        return [];
    }
    getBody(): string | undefined {
        return undefined;
    }
    isLocal(): boolean {
        return false;
    }
    async getVariables(): Promise<ALVariable[]> {
        return [];
    }
    async getParameters(): Promise<ALVariable[]> {
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
    getJumpToCreatedProcedure(): boolean {
        return true;
    }
}