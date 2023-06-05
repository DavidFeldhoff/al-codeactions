import { ICreateProcedure } from "./ICreateProcedure";
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { ALObject } from "../../Entities/alObject";
import { ALVariable } from "../../Entities/alVariable";
import { ALFullSyntaxTreeNode } from "../../AL Code Outline/alFullSyntaxTreeNode";
import { FullSyntaxTreeNodeKind } from "../../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNodeExt } from "../../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { ALParameterParser } from "../../Entity Parser/alParameterParser";
import { TextRangeExt } from "../../AL Code Outline Ext/textRangeExt";
import { DocumentUtils } from "../../Utils/documentUtils";
import { TypeDetective } from "../../Utils/typeDetective";
import { SyntaxTreeExt } from "../../AL Code Outline Ext/syntaxTreeExt";
import { ALObjectParser } from "../../Entity Parser/alObjectParser";
import { OwnConsole } from "../../console";
import { AccessModifier } from "../../Entities/accessModifier";
import { Err } from "../../Utils/Err";
import { commands, Diagnostic, Location, Position, Range, TextDocument, workspace } from "vscode";

export class CreateProcedureAL0132 implements ICreateProcedure {
    syntaxTree: SyntaxTree | undefined;
    document: TextDocument;
    diagnostic: Diagnostic;
    objectOfNewProcedure: ALObject | undefined;
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
    async getAccessModifier(): Promise<AccessModifier> {
        if (!this.syntaxTree) {
            throw "SyntaxTree not initialized"
        }
        const alObject = await this.getObject();
        if (!alObject.documentUri)
            return AccessModifier.internal;
        const currentWorkspaceFolder = workspace.getWorkspaceFolder(this.document.uri)
        const workspaceFolderOfOtherObject = workspace.getWorkspaceFolder(alObject.documentUri)
        if (currentWorkspaceFolder && workspaceFolderOfOtherObject && (currentWorkspaceFolder.uri.fsPath !== workspaceFolderOfOtherObject.uri.fsPath))
            return AccessModifier.public
        else
            return AccessModifier.internal;
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
        if (this.returnType.analyzed)
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
        if (this.objectOfNewProcedure) {
            return this.objectOfNewProcedure;
        }
        let locations: Location[] | undefined;
        let checkPagePart: { isPagePart: boolean, PagePartSourceRange: Range } | undefined = await this.isPagePartCall(this.document, this.diagnostic.range.start);
        if (checkPagePart && checkPagePart.isPagePart) {
            locations = await commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, checkPagePart.PagePartSourceRange.start);
        } else {
            let member: string = ''
            if (this.diagnostic.range.start.character > 2)
                member = this.document.getText(this.document.getWordRangeAtPosition(this.diagnostic.range.start.translate(0, -2)))
            if (member.toLowerCase() == 'rec') {
                locations = [{ uri: this.document.uri, range: this.diagnostic.range }]
            } else {
                let positionOfCalledObject = this.diagnostic.range.start.translate(0, -2);
                locations = await commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfCalledObject);
                if (locations && locations.length > 0) {
                    let positionOfVariableDeclaration: Position = locations[0].range.start;
                    locations = await commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfVariableDeclaration);
                }
            }
        }
        if (locations && locations.length > 0) {
            let otherDoc: TextDocument = await workspace.openTextDocument(locations[0].uri);
            let otherDocSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(otherDoc);
            let otherObjectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(otherDocSyntaxTree, locations[0].range.start);
            if (otherObjectTreeNode) {
                this.objectOfNewProcedure = ALObjectParser.parseObjectTreeNodeToALObject(otherDoc, otherObjectTreeNode);
                return this.objectOfNewProcedure;
            }
        }

        let errorMessage = 'Unable to find calling object';
        OwnConsole.ownConsole.appendLine('Error: ' + errorMessage);
        Err._throw(errorMessage);
    }
    getJumpToCreatedProcedure(): boolean {
        return true;
    }
    containsSnippet(): boolean {
        return false;
    }


    private async isPagePartCall(document: TextDocument, positionOfMissingProcedure: Position): Promise<{ isPagePart: boolean, PagePartSourceRange: Range } | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        //Level 1: [0] MemberAccessExpression, [1] Identifier: MissingProcedure, 
        //Level 2: [0] MemberAccessExpression, [1] Identifier: Page,
        //Level 3: [0] Identifier: CurrPage, [1] Identifier: Name of PagePart,
        let level1: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(positionOfMissingProcedure, [FullSyntaxTreeNodeKind.getMemberAccessExpression()])
        if (level1 && level1.childNodes && level1.childNodes[0].kind == FullSyntaxTreeNodeKind.getMemberAccessExpression()) {
            let level2 = level1.childNodes[0];
            if (level2 && level2.childNodes) {
                if (level2.childNodes[0].kind == FullSyntaxTreeNodeKind.getMemberAccessExpression() &&
                    document.getText(TextRangeExt.createVSCodeRange(level2.childNodes[1].fullSpan)).toLowerCase() == 'page') {
                    let level3 = level2.childNodes[0];
                    if (level3.childNodes && level3.childNodes[0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                        document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(level3.childNodes[0].fullSpan))).toLowerCase() == 'currpage') {
                        let pagePartName: string = document.getText(TextRangeExt.createVSCodeRange(level3.childNodes[1].fullSpan)).toLowerCase();
                        let pageParts: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getPagePart());
                        let pagePart: ALFullSyntaxTreeNode | undefined = pageParts.find(pagePart =>
                            pagePart.childNodes &&
                            pagePart.childNodes[0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                            document.getText(TextRangeExt.createVSCodeRange(pagePart.childNodes[0].fullSpan)).toLowerCase() == pagePartName);
                        if (pagePart && pagePart.childNodes && pagePart.childNodes.length >= 2) {
                            let rangeOfObjectReference: Range = TextRangeExt.createVSCodeRange(pagePart.childNodes[1].fullSpan);
                            return { isPagePart: true, PagePartSourceRange: rangeOfObjectReference };
                        }
                    }
                }
            }
        }
        return undefined;
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