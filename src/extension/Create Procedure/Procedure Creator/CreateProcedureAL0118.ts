import { ICreateProcedure } from './ICreateProcedure';
import * as vscode from 'vscode';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from '../../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALVariable } from '../../Entities/alVariable';
import { ALObject } from '../../Entities/alObject';
import { SyntaxTreeExt } from '../../AL Code Outline Ext/syntaxTreeExt';
import { ALObjectParser } from '../../Entity Parser/alObjectParser';
import { TextRangeExt } from '../../AL Code Outline Ext/textRangeExt';
import { DocumentUtils } from '../../documentUtils';
import { TypeDetective } from '../../typeDetective';
import { ALParameterParser } from '../../Entity Parser/alParameterParser';
import { ALFullSyntaxTreeNodeExt } from '../../AL Code Outline Ext/alFullSyntaxTreeNodeExt';

export class CreateProcedureAL0118 implements ICreateProcedure {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
    }
    async initialize() {
        this.syntaxTree = await SyntaxTree.getInstance(this.document, true);
    }
    getProcedureName(): string {
        return this.document.getText(this.diagnostic.range);
    }
    isLocal(): boolean {
        return true;
    }
    async getVariables(): Promise<ALVariable[]> {
        return [];
    }
    async getParameters(): Promise<ALVariable[]> {
        if (!this.syntaxTree) { return []; }
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;

        let argumentList: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationExpressionTreeNode, FullSyntaxTreeNodeKind.getArgumentList(), false) as ALFullSyntaxTreeNode;
        return await ALParameterParser.createParametersOutOfArgumentListTreeNode(this.document, argumentList, this.document.getText(this.diagnostic.range));
    }
    async getReturnType(): Promise<string | undefined> {
        if (!this.syntaxTree) { return undefined; }
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        let invocationExpressionRange: vscode.Range = TextRangeExt.createVSCodeRange(invocationExpressionTreeNode.fullSpan);
        invocationExpressionRange = DocumentUtils.trimRange(this.document, invocationExpressionRange);

        let returnType: string | undefined = await TypeDetective.findReturnTypeOfPosition(this.document, invocationExpressionRange);
        return returnType;
    }
    async getObject(): Promise<ALObject> {
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(this.syntaxTree as SyntaxTree, this.diagnostic.range.start);
        if (!objectTreeNode) {
            throw new Error('Object Tree node has to be found.');
        }
        return ALObjectParser.parseObjectTreeNodeToALObject(this.document, objectTreeNode);
    }
}