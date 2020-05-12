import * as vscode from 'vscode';
import { ALProcedure } from './alProcedure';
import { ALVariable } from './alVariable';
import { ALParameterParser } from './alParameterParser';
import { ALObject } from './alObject';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { DocumentUtils } from './documentUtils';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';
import { TypeDetective } from './typeDetective';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';

export class ALProcedureCallParser {
    private document: vscode.TextDocument;
    private diagnostic: vscode.Diagnostic;
    private calledALObject: ALObject | undefined;
    private calledProcedureName: string;

    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.diagnostic = diagnostic;
        this.document = document;
        this.calledProcedureName = document.getText(diagnostic.range);
    }
    public async initialize() {
        let calledObjectSymbol = await this.getCalledObjectSymbol();
        this.calledALObject = new ALObject(calledObjectSymbol.name, calledObjectSymbol.icon, calledObjectSymbol.id, await this.getDocumentUriOfCalledObject());

        let callingObjectSymbol = await this.getCallingObjectSymbol();
    }

    public async getProcedure(): Promise<ALProcedure | undefined> {
        let returnType: string | undefined;
        let parameters: ALVariable[];

        let isLocal: boolean;
        if (this.diagnostic.code?.toString() === SupportedDiagnosticCodes.AL0132.toString()) {
            isLocal = false;
            if (!this.canObjectContainProcedures(this.calledALObject as ALObject)) {
                return;
            }
        } else {
            isLocal = true;
        }

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        let invocationExpressionRange: vscode.Range = TextRangeExt.createVSCodeRange(invocationExpressionTreeNode.fullSpan);
        invocationExpressionRange = DocumentUtils.trimRange(this.document, invocationExpressionRange);
        
        let argumentList: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationExpressionTreeNode, FullSyntaxTreeNodeKind.getArgumentList(), false) as ALFullSyntaxTreeNode;
        parameters = await this.createParametersOutOfArgumentListTreeNode(argumentList, this.calledProcedureName);

        returnType = await this.getReturnType(this.document, invocationExpressionRange);

        return new ALProcedure(this.calledProcedureName, parameters, [], returnType, isLocal, this.calledALObject as ALObject);
    }
    private async getReturnType(document: vscode.TextDocument, range: vscode.Range): Promise<string | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        while (invocationExpressionTreeNode.parentNode && invocationExpressionTreeNode.parentNode.kind === FullSyntaxTreeNodeKind.getParenthesizedExpression()) {
            invocationExpressionTreeNode = invocationExpressionTreeNode.parentNode;
        }
        if (invocationExpressionTreeNode.parentNode && invocationExpressionTreeNode.parentNode.kind && invocationExpressionTreeNode.parentNode.childNodes) {
            switch (invocationExpressionTreeNode.parentNode.kind) {
                //TODO: Variable, Parameter, Table Field, Rec.TableField, If Statement
                case FullSyntaxTreeNodeKind.getArgumentList():
                    let argumentNo: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(invocationExpressionTreeNode.parentNode, invocationExpressionTreeNode);
                    let signatureHelp: vscode.SignatureHelp | undefined = await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider', this.document.uri, TextRangeExt.createVSCodeRange(invocationExpressionTreeNode.span).start, ',');
                    if (signatureHelp) {
                        let parameterName = signatureHelp.signatures[0].parameters[argumentNo[0]].label;
                        let procedureDeclarationLine = signatureHelp.signatures[0].label;
                        let parentInvocation: ALFullSyntaxTreeNode | undefined = invocationExpressionTreeNode.parentNode.parentNode;
                        if (parentInvocation && parentInvocation.childNodes && parentInvocation.childNodes[0].identifier) {
                            let declarationLineWithoutProcedureName: string = procedureDeclarationLine.substring(procedureDeclarationLine.indexOf(parentInvocation.childNodes[0].identifier) + parentInvocation.childNodes[0].identifier.length);
                            let regExp: RegExp = new RegExp('(?:[(]|,\\s)' + parameterName + '\\s*:\\s*(?<type>[^,)]+)');
                            let matcher: RegExpMatchArray | null = declarationLineWithoutProcedureName.match(regExp);
                            if (matcher && matcher.groups) {
                                return matcher.groups['type'].trim();
                            }
                        }
                    }
                    break;
                case FullSyntaxTreeNodeKind.getUnaryMinusExpression():
                case FullSyntaxTreeNodeKind.getUnaryPlusExpression():
                    return 'Decimal';
                case FullSyntaxTreeNodeKind.getIfStatement():
                case FullSyntaxTreeNodeKind.getLogicalAndExpression():
                case FullSyntaxTreeNodeKind.getLogicalOrExpression():
                case FullSyntaxTreeNodeKind.getUnaryNotExpression():
                    return 'Boolean';
                case FullSyntaxTreeNodeKind.getArrayIndexExpression():
                    return 'Integer';
                case FullSyntaxTreeNodeKind.getAssignmentStatement():
                case FullSyntaxTreeNodeKind.getCompoundAssignmentStatement():
                case FullSyntaxTreeNodeKind.getLessThanExpression():
                case FullSyntaxTreeNodeKind.getLessThanOrEqualExpression():
                case FullSyntaxTreeNodeKind.getGreaterThanOrEqualExpression():
                case FullSyntaxTreeNodeKind.getGreaterThanExpression():
                case FullSyntaxTreeNodeKind.getEqualsExpression():
                case FullSyntaxTreeNodeKind.getNotEqualsExpression():
                case FullSyntaxTreeNodeKind.getAddExpression():
                case FullSyntaxTreeNodeKind.getSubtractExpression():
                case FullSyntaxTreeNodeKind.getMultiplyExpression():
                case FullSyntaxTreeNodeKind.getDivideExpression():
                    //If the parent node is one of these kinds, then it always has to be found the kind of the counterpart
                    let indexOfInvocationTreeNode: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(invocationExpressionTreeNode.parentNode, invocationExpressionTreeNode);
                    let indexOfOtherTreeNode: number = indexOfInvocationTreeNode[0] === 0 ? 1 : 0;
                    let otherTreeNode: ALFullSyntaxTreeNode = invocationExpressionTreeNode.parentNode.childNodes[indexOfOtherTreeNode];

                    let typeDetective2: TypeDetective = new TypeDetective(this.document, otherTreeNode);
                    await typeDetective2.getTypeOfTreeNode();
                    return typeDetective2.getType();
            }
        }
        return undefined;
    }

    private canObjectContainProcedures(alObject: ALObject) {
        switch (alObject.type.toString().toLowerCase()) {
            case "enum":
                return false;
            default:
                return true;
        }
    }
    private async createParametersOutOfArgumentListTreeNode(argumentListTreeNode: ALFullSyntaxTreeNode, procedureNameToCreate: string): Promise<ALVariable[]> {
        let parameters = await ALParameterParser.createALVariableArrayOutOfArgumentListTreeNode(argumentListTreeNode, this.document);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }
    private async getCallingObjectSymbol(): Promise<any> {
        return ALCodeOutlineExtension.getFirstObjectSymbolOfDocumentUri(this.document.uri);
    }
    private async getCalledObjectSymbol(): Promise<any> {
        let documentUriOfCalledObject: vscode.Uri = await this.getDocumentUriOfCalledObject();
        return ALCodeOutlineExtension.getFirstObjectSymbolOfDocumentUri(documentUriOfCalledObject);
    }
    private async getDocumentUriOfCalledObject(): Promise<vscode.Uri> {
        let documentUri: vscode.Uri | undefined;
        if (this.diagnostic.code?.toString() === SupportedDiagnosticCodes.AL0132.toString()) {
            let positionOfCalledObject = this.diagnostic.range.start.translate(0, -2);
            let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfCalledObject);
            if (locations && locations.length > 0) {
                let positionOfVariableDeclaration: vscode.Position = locations[0].range.start;
                locations = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfVariableDeclaration);
                if (locations && locations.length > 0) {
                    documentUri = locations[0].uri;
                }
            }
        } else {
            documentUri = this.document.uri;
        }

        if (!documentUri) {
            throw new Error('Could not find symbol of called object using az al dev tools.');
        } else {
            return documentUri;

        }
    }
}