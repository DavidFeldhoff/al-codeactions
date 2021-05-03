import { ICreateProcedure } from './ICreateProcedure';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from '../../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALVariable } from '../../Entities/alVariable';
import { ALObject } from '../../Entities/alObject';
import { SyntaxTreeExt } from '../../AL Code Outline Ext/syntaxTreeExt';
import { ALObjectParser } from '../../Entity Parser/alObjectParser';
import { TextRangeExt } from '../../AL Code Outline Ext/textRangeExt';
import { DocumentUtils } from '../../Utils/documentUtils';
import { TypeDetective } from '../../Utils/typeDetective';
import { ALParameterParser } from '../../Entity Parser/alParameterParser';
import { ALFullSyntaxTreeNodeExt } from '../../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { AccessModifier } from '../../Entities/accessModifier';
import { Err } from '../../Utils/Err';
import { Diagnostic, Range, TextDocument } from 'vscode';

export class CreateProcedureAL0118 implements ICreateProcedure {
    syntaxTree: SyntaxTree | undefined;
    document: TextDocument;
    diagnostic: Diagnostic;
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
    }
    async initialize() {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
    }
    getProcedureName(): string {
        return this.document.getText(this.diagnostic.range);
    }
    getMemberAttributes(): string[] {
        return [];
    }
    getBody(): string | undefined {
        return undefined;
    }
    getAccessModifier(): AccessModifier {
        return AccessModifier.local;
    }
    async getVariables(): Promise<ALVariable[]> {
        return [];
    }
    async getParameters(): Promise<ALVariable[]> {
        if (!this.syntaxTree) { return []; }
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;

        let argumentList: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationExpressionTreeNode, FullSyntaxTreeNodeKind.getArgumentList(), false) as ALFullSyntaxTreeNode;
        let parameters: ALVariable[] = await ALParameterParser.createParametersOutOfArgumentListTreeNode(this.document, argumentList, this.document.getText(this.diagnostic.range), true);
        if (this.isVarForced())
            parameters.forEach(parameter => { if (parameter.canBeVar) { parameter.isVar = true } })
        return parameters;
    }
    isVarForced(): boolean {
        return false;
    }
    async getReturnType(): Promise<string | undefined> {
        if (!this.syntaxTree) { return undefined; }
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        let invocationExpressionRange: Range = TextRangeExt.createVSCodeRange(invocationExpressionTreeNode.fullSpan);
        invocationExpressionRange = DocumentUtils.trimRange(this.document, invocationExpressionRange);

        let returnType: string | undefined = await TypeDetective.findReturnTypeOfInvocationAtPosition(this.document, invocationExpressionRange.start);
        return returnType;
    }
    async getObject(): Promise<ALObject> {
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(this.syntaxTree as SyntaxTree, this.diagnostic.range.start);
        if (!objectTreeNode)
            Err._throw('Object Tree node has to be found.');

        return ALObjectParser.parseObjectTreeNodeToALObject(this.document, objectTreeNode);
    }
    getJumpToCreatedProcedure(): boolean {
        return true;
    }
    containsSnippet(): boolean {
        return false;
    }
    isReturnTypeRequired(): boolean {
        let invocationNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree?.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
        if (invocationNode)
            if (invocationNode.parentNode!.kind == FullSyntaxTreeNodeKind.getPageField())
                return true
        return false
    }
}