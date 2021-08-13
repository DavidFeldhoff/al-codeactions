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
    private returnType: { analyzed: boolean, type: string | undefined }
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
        this.returnType = { analyzed: false, type: undefined }
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
        let parameters: ALVariable[] = await ALParameterParser.createParametersOutOfArgumentListTreeNode(this.document, argumentList, this.document.getText(this.diagnostic.range), true, this.isVarForced());
        return parameters;
    }
    isVarForced(): boolean {
        return false;
    }
    async getReturnType(): Promise<string | undefined> {
        if(this.returnType.analyzed)
            return this.returnType.type
        if (!this.syntaxTree) { return undefined; }
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        let invocationExpressionRange: Range = TextRangeExt.createVSCodeRange(invocationExpressionTreeNode.fullSpan);
        invocationExpressionRange = DocumentUtils.trimRange(this.document, invocationExpressionRange);

        this.returnType.type = await TypeDetective.findReturnTypeOfInvocationAtPosition(this.document, invocationExpressionRange.start);
        this.returnType.analyzed = true
        return this.returnType.type;
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
    async isReturnTypeRequired(): Promise<boolean> {
        let invocationNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree?.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
        if (invocationNode) {
            if (invocationNode.parentNode!.kind == FullSyntaxTreeNodeKind.getPageField())
                return true
            if (invocationNode.parentNode!.kind == FullSyntaxTreeNodeKind.getArgumentList() && (await this.getReturnType()) === undefined)
                return true
        }
        return false
    }
}