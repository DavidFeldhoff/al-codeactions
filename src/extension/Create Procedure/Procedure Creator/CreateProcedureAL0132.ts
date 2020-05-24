import * as vscode from "vscode";
import { ICreateProcedure } from "./ICreateProcedure";
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { ALObject } from "../../Entities/alObject";
import { ALVariable } from "../../Entities/alVariable";
import { ALFullSyntaxTreeNode } from "../../AL Code Outline/alFullSyntaxTreeNode";
import { FullSyntaxTreeNodeKind } from "../../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNodeExt } from "../../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { ALParameterParser } from "../../Entity Parser/alParameterParser";
import { TextRangeExt } from "../../AL Code Outline Ext/textRangeExt";
import { DocumentUtils } from "../../documentUtils";
import { TypeDetective } from "../../typeDetective";
import { SyntaxTreeExt } from "../../AL Code Outline Ext/syntaxTreeExt";
import { ALObjectParser } from "../../Entity Parser/alObjectParser";
import { OwnConsole } from "../../console";

export class CreateProcedureAL0132 implements ICreateProcedure {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    objectOfNewProcedure: ALObject | undefined;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
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
    isLocal(): boolean {
        return false;
    }
    async getVariables(): Promise<ALVariable[]> {
        return [];
    }
    async getParameters(): Promise<ALVariable[]> {
        if (!this.syntaxTree) { return []; }
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;

        let argumentList: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationExpressionTreeNode, FullSyntaxTreeNodeKind.getArgumentList(), false) as ALFullSyntaxTreeNode;
        return await ALParameterParser.createParametersOutOfArgumentListTreeNode(this.document, argumentList, this.document.getText(this.diagnostic.range), true);
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
        if (this.objectOfNewProcedure) {
            return this.objectOfNewProcedure;
        }
        let positionOfCalledObject = this.diagnostic.range.start.translate(0, -2);
        let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfCalledObject);
        if (locations && locations.length > 0) {
            let positionOfVariableDeclaration: vscode.Position = locations[0].range.start;
            locations = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfVariableDeclaration);
            if (locations && locations.length > 0) {
                let otherDoc: vscode.TextDocument = await vscode.workspace.openTextDocument(locations[0].uri);
                let otherDocSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(otherDoc);
                let otherObjectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(otherDocSyntaxTree, locations[0].range.start);
                if (otherObjectTreeNode) {
                    return ALObjectParser.parseObjectTreeNodeToALObject(otherDoc, otherObjectTreeNode);
                }
            }
        }
        let errorMessage = 'Unable to find calling object';
        OwnConsole.ownConsole.appendLine('Error: ' + errorMessage);
        throw new Error(errorMessage);
    }
}