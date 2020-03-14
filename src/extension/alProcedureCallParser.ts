import * as vscode from 'vscode';
import { isNull, isUndefined } from 'util';
import { ALProcedure } from './alProcedure';
import { ALVariableHandler } from './alVariableHandler';
import { ALVariable } from './alVariable';
import { ALParameterParser } from './alParameterParser';
import { ALSourceCodeHandler } from './alSourceCodeHandler';
import { RegExpCreator } from './regexpCreator';
import { ALObject } from './alObject';
import { ALTypeHandler } from './alTypeHandler';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { ALVariableParser } from './alVariableParser';

export class ALProcedureCallParser {
    private document: vscode.TextDocument;
    private diagnostic: vscode.Diagnostic;
    private alVariableHandler?: ALVariableHandler;
    private procedureCall?: string;
    private rangeOfProcedureCall: vscode.Range;
    private callingProcedureSymbol: any;
    private callingALObject?: ALObject;
    private calledALObject: ALObject | undefined;
    private calledProcedureName: string;

    constructor(document: vscode.TextDocument, rangeOfProcedureCall: vscode.Range, diagnostic: vscode.Diagnostic) {
        this.diagnostic = diagnostic;
        this.rangeOfProcedureCall = rangeOfProcedureCall;
        this.document = document;
        this.calledProcedureName = document.getText(diagnostic.range);
    }
    public async initialize() {
        let calledObjectSymbol = await this.getCalledObjectSymbol();
        this.calledALObject = new ALObject(calledObjectSymbol.name, calledObjectSymbol.icon, calledObjectSymbol.id);

        let callingObjectSymbol = await this.getCallingObjectSymbol();
        this.callingALObject = new ALObject(callingObjectSymbol.name, callingObjectSymbol.icon, callingObjectSymbol.id);

        this.procedureCall = this.document.getText(this.rangeOfProcedureCall);

        this.callingProcedureSymbol = await ALCodeOutlineExtension.getProcedureOrTriggerSymbolOfCurrentLine(this.document.uri, this.rangeOfProcedureCall.start.line);
    }

    public async getProcedure(): Promise<ALProcedure | undefined> {
        let returnType: string | undefined;
        let parameters: ALVariable[];

        let execArray = RegExpCreator.matchWholeProcedureCall.exec(this.procedureCall as string);
        if (isNull(execArray) || isUndefined(execArray.groups)) {
            return;
        }
        if (!isUndefined(execArray.groups["returnVar"])) {
            let alVariable: ALVariable | undefined = ALVariableHandler.getALVariableByNameOfSymbol(execArray.groups["returnVar"], this.callingProcedureSymbol);
            if (alVariable) {
                returnType = alVariable.type;
            }
        }
        parameters = await this.getParametersOfProcedureCall(execArray.groups["params"], this.calledProcedureName);

        return new ALProcedure(this.calledProcedureName, parameters, returnType, this.calledALObject as ALObject);
    }
    private async getParametersOfProcedureCall(parameterCallString: string, procedureNameToCreate: string): Promise<ALVariable[]> {
        let parameters = await ALParameterParser.parseParameterCallStringToALVariableArray(parameterCallString, this.callingProcedureSymbol, this.document, this.rangeOfProcedureCall);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }
    private async getCallingObjectSymbol() : Promise<any>{
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
            let positionOfCalledObject = new vscode.Position(this.diagnostic.range.start.line, this.diagnostic.range.start.character - 2);
            let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfCalledObject);
            if (locations && locations.length > 0) {
                let positionOfDeclaredVariable: vscode.Position = locations[0].range.start;
                locations = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfDeclaredVariable);
                if (locations && locations.length > 0) {
                    documentUri = locations[0].uri;
                }
            }
        } else {
            documentUri = this.document.uri;
        }
        
        if (!documentUri) {
            throw new Error('Could not find symbol of called object using az al dev tools.');
        } else{
            return documentUri;
        }
    }
}