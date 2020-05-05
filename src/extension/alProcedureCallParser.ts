import * as vscode from 'vscode';
import { ALProcedure } from './alProcedure';
import { ALVariableHandler } from './alVariableHandler';
import { ALVariable } from './alVariable';
import { ALParameterParser } from './alParameterParser';
import { ALObject } from './alObject';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { ALVariableParser } from './alVariableParser';
import { ALSymbolHandler } from './alSymbolHandler';
import { DocumentUtils } from './documentUtils';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';

export class ALProcedureCallParser {
    private document: vscode.TextDocument;
    private diagnostic: vscode.Diagnostic;
    private callingALObject?: ALObject;
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
        this.callingALObject = new ALObject(callingObjectSymbol.name, callingObjectSymbol.icon, callingObjectSymbol.id, this.document.uri);
    }

    public async getProcedure(): Promise<ALProcedure | undefined> {
        let returnType: string | undefined;
        let parameters: ALVariable[];

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        let invocationExpressionRange: vscode.Range = TextRangeExt.createVSCodeRange(invocationExpressionTreeNode.fullSpan);
        let procedureCall: string = this.document.getText(invocationExpressionRange);

        let assignmentStatementTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(invocationExpressionRange.start, [FullSyntaxTreeNodeKind.getAssignmentStatement(), FullSyntaxTreeNodeKind.getCompoundAssignmentStatement()]);
        if (assignmentStatementTreeNode && assignmentStatementTreeNode.childNodes) {
            let assignedTreeNode: ALFullSyntaxTreeNode = assignmentStatementTreeNode.childNodes[0];
        }
        let rangeOfReturnPart: vscode.Range | undefined;
        let rangeOfProcedureCall: vscode.Range;
        if (procedureCall.includes(':=')) {
            rangeOfReturnPart = new vscode.Range(this.rangeOfWholeProcedureCall.start, new vscode.Position(this.rangeOfWholeProcedureCall.start.line, procedureCall.indexOf(':=') + this.rangeOfWholeProcedureCall.start.character));
            let amountSpacesAtEnd: number = this.document.getText(rangeOfReturnPart).length - this.document.getText(rangeOfReturnPart).trimRight().length;
            rangeOfReturnPart = new vscode.Range(rangeOfReturnPart.start, rangeOfReturnPart.end.translate(0, amountSpacesAtEnd * -1));
            let rangeOfReturnPartText: string = this.document.getText(rangeOfReturnPart); //for debugging purposes
            rangeOfProcedureCall = new vscode.Range(rangeOfReturnPart.end.translate(0, 2), this.rangeOfWholeProcedureCall.end);
            let amountSpacesAtBeginning: number = this.document.getText(rangeOfProcedureCall).length - this.document.getText(rangeOfProcedureCall).trimLeft().length;
            rangeOfProcedureCall = new vscode.Range(rangeOfProcedureCall.start.translate(0, amountSpacesAtBeginning), rangeOfProcedureCall.end);
            let rangeOfProcedureCallText: string = this.document.getText(rangeOfProcedureCall); //for debugging purposes
        } else {
            rangeOfProcedureCall = this.rangeOfWholeProcedureCall;
        }

        if (rangeOfReturnPart) {
            let wordRange: vscode.Range | undefined = DocumentUtils.getNextWordRangeInsideLine(this.document, this.rangeOfWholeProcedureCall);
            if (wordRange) {
                let rangeNextCharacter = new vscode.Range(wordRange.end, wordRange.end.translate(0, 1));
                let textNextCharacter = this.document.getText(rangeNextCharacter);
                if (this.document.getText(rangeNextCharacter) === '.') {
                    let objectTextRange = wordRange;
                    let fieldOrMethodTextRange = DocumentUtils.getNextWordRangeInsideLine(this.document, this.rangeOfWholeProcedureCall, objectTextRange.end);
                    if (fieldOrMethodTextRange) {
                        let alSymbolHandler: ALSymbolHandler = new ALSymbolHandler();
                        let symbol = await alSymbolHandler.findSymbol(this.document, fieldOrMethodTextRange.start, this.document.getText(fieldOrMethodTextRange));
                        if (symbol) {
                            let uri: vscode.Uri = alSymbolHandler.getLastUri() as vscode.Uri;
                            if (ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(symbol.kind)) {
                                //TODO: Procedure as parameter: Get type of parameter
                                // returnType =
                            } else if (ALCodeOutlineExtension.isSymbolKindVariableOrParameter(symbol.kind)) {
                                returnType = symbol.subtype;
                            } else if (ALCodeOutlineExtension.isSymbolKindTableField(symbol.kind)) {
                                returnType = (await ALVariableParser.parseFieldSymbolToALVariable(symbol, uri)).type;
                            }
                        }
                    }
                } else {
                    //TODO: Procedure as parameter: Missing branch
                    let alSymbolHandler: ALSymbolHandler = new ALSymbolHandler();
                    let symbol = await alSymbolHandler.findSymbol(this.document, wordRange.start, this.document.getText(wordRange));
                    if (symbol) {
                        let uri: vscode.Uri = alSymbolHandler.getLastUri() as vscode.Uri;
                        if (ALCodeOutlineExtension.isSymbolKindVariableOrParameter(symbol.kind)) {
                            returnType = symbol.subtype;
                        } else if (ALCodeOutlineExtension.isSymbolKindTableField(symbol.kind)) {
                            returnType = (await ALVariableParser.parseFieldSymbolToALVariable(symbol, uri)).type;
                        }
                    }
                }
            }
        }

        let isLocal: boolean;
        if (this.diagnostic.code?.toString() === SupportedDiagnosticCodes.AL0132.toString()) {
            isLocal = false;
            if (!this.canObjectContainProcedures(this.calledALObject as ALObject)) {
                return;
            }
        } else {
            isLocal = true;
        }

        let argumentListRange: vscode.Range = ALParameterParser.getArgumentListRangeOfDiagnostic(this.document, this.diagnostic);
        parameters = await this.createParametersOutOfArgumentListRange(argumentListRange, this.calledProcedureName);

        return new ALProcedure(this.calledProcedureName, parameters, [], returnType, isLocal, this.calledALObject as ALObject);
    }
    private canObjectContainProcedures(alObject: ALObject) {
        switch (alObject.type.toString().toLowerCase()) {
            case "enum":
                return false;
            default:
                return true;
        }
    }
    private async createParametersOutOfArgumentListRange(rangeOfArgumentList: vscode.Range, procedureNameToCreate: string): Promise<ALVariable[]> {
        let parameters = await ALParameterParser.createALVariableArrayOutOfArgumentListRange(rangeOfArgumentList, this.document);
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