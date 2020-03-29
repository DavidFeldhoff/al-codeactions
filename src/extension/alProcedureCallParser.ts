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

export class ALProcedureCallParser {
    private document: vscode.TextDocument;
    private diagnostic: vscode.Diagnostic;
    private rangeOfWholeProcedureCall: vscode.Range;
    private callingProcedureSymbol: any;
    private callingALObject?: ALObject;
    private calledALObject: ALObject | undefined;
    private calledProcedureName: string;

    constructor(document: vscode.TextDocument, rangeOfProcedureCall: vscode.Range, diagnostic: vscode.Diagnostic) {
        this.diagnostic = diagnostic;
        this.rangeOfWholeProcedureCall = rangeOfProcedureCall;
        this.document = document;
        this.calledProcedureName = document.getText(diagnostic.range);
    }
    public async initialize() {
        let calledObjectSymbol = await this.getCalledObjectSymbol();
        this.calledALObject = new ALObject(calledObjectSymbol.name, calledObjectSymbol.icon, calledObjectSymbol.id, await this.getDocumentUriOfCalledObject());

        let callingObjectSymbol = await this.getCallingObjectSymbol();
        this.callingALObject = new ALObject(callingObjectSymbol.name, callingObjectSymbol.icon, callingObjectSymbol.id, this.document.uri);

        this.callingProcedureSymbol = await ALCodeOutlineExtension.getProcedureOrTriggerSymbolOfCurrentLine(this.document.uri, this.rangeOfWholeProcedureCall.start.line);
    }

    public async getProcedure(): Promise<ALProcedure | undefined> {
        let returnType: string | undefined;
        let parameters: ALVariable[];

        let procedureCall: string = this.document.getText(this.rangeOfWholeProcedureCall);

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
            let wordRange: vscode.Range | undefined = DocumentUtils.getNextWordRange(this.document, this.rangeOfWholeProcedureCall);
            if (wordRange) {
                let rangeNextCharacter = new vscode.Range(wordRange.end, wordRange.end.translate(0, 1));
                let textNextCharacter = this.document.getText(rangeNextCharacter);
                if (this.document.getText(rangeNextCharacter) === '.') {
                    let objectTextRange = wordRange;
                    let fieldOrMethodTextRange = DocumentUtils.getNextWordRange(this.document, this.rangeOfWholeProcedureCall, objectTextRange.end);
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

        let parametersRange: vscode.Range = ALParameterParser.getParameterCallRangeOfDiagnostic(this.document, this.diagnostic);
        parameters = await this.getParametersOfProcedureCall(parametersRange, this.calledProcedureName);

        return new ALProcedure(this.calledProcedureName, parameters, returnType, isLocal, this.calledALObject as ALObject);
    }
    private canObjectContainProcedures(alObject: ALObject) {
        switch (alObject.type.toString().toLowerCase()) {
            case "enum":
                return false;
            default:
                return true;
        }
    }
    private async getParametersOfProcedureCall(rangeOfParameterCall: vscode.Range, procedureNameToCreate: string): Promise<ALVariable[]> {
        let parameters = await ALParameterParser.parseParameterCallRangeToALVariableArray(rangeOfParameterCall, this.callingProcedureSymbol, this.document);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }
    private async getCallingObjectSymbol(): Promise<any> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let symbolsLibraryCallingObject = await azalDevTools.symbolsService.loadDocumentSymbols(this.document.uri);
        return symbolsLibraryCallingObject.rootSymbol.findFirstObjectSymbol();
    }
    private async getCalledObjectSymbol(): Promise<any> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let documentUriOfCalledObject: vscode.Uri = await this.getDocumentUriOfCalledObject();
        let symbolsLibraryCalledObject: any = await azalDevTools.symbolsService.loadDocumentSymbols(documentUriOfCalledObject);
        return symbolsLibraryCalledObject.rootSymbol.findFirstObjectSymbol();
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