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

export class ALProcedureCallParser {
    private document: vscode.TextDocument;
    private diagnostic: vscode.Diagnostic;
    private alVariableHandler?: ALVariableHandler;
    private procedureCall?: string;
    private rangeOfProcedureCall: vscode.Range;
    private callingProcedureName?: string;
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
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let symbolsLibraryCallingObject = await azalDevTools.symbolsService.loadDocumentSymbols(this.document.uri);
        let symbolOfMissingProcedure = symbolsLibraryCallingObject.findNextSymbol(this.diagnostic.range.start.line);
        let symbolsLibraryCalledObject: any;
        if (this.diagnostic.code?.toString() === SupportedDiagnosticCodes.AL0132.toString()) {
            let positionOfCalledObject = new vscode.Position(this.diagnostic.range.start.line, this.diagnostic.range.start.character - 2);
            let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfCalledObject);
            if (locations && locations.length > 0) {
                let positionOfDeclaredVariable: vscode.Position = locations[0].range.start;
                locations = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, positionOfDeclaredVariable);
                if (locations && locations.length > 0) {
                    symbolsLibraryCalledObject = await azalDevTools.symbolsService.loadDocumentSymbols(locations[0].uri);
                }
            }
            if (!symbolsLibraryCalledObject) {
                throw new Error('Could not find symbol of called object using az al dev tools.');
            }
        } else {
            symbolsLibraryCalledObject = symbolsLibraryCallingObject;
        }
        let calledObjectSymbol = symbolsLibraryCalledObject.rootSymbol.findFirstObjectSymbol();
        this.calledALObject = new ALObject(calledObjectSymbol.name, calledObjectSymbol.icon, calledObjectSymbol.id);

        let callingObjectSymbol = symbolsLibraryCallingObject.rootSymbol.findFirstObjectSymbol();
        this.callingALObject = new ALObject(callingObjectSymbol.name, callingObjectSymbol.icon, callingObjectSymbol.id);

        this.procedureCall = this.document.getText(this.rangeOfProcedureCall);

        this.alVariableHandler = new ALVariableHandler(this.document);
        await this.alVariableHandler.search();

        const alSourceCodeHandler = new ALSourceCodeHandler(this.document);
        this.callingProcedureName = await alSourceCodeHandler.getProcedureOrTriggerNameOfCurrentPosition(this.rangeOfProcedureCall.start.line);
    }

    public async getProcedure(): Promise<ALProcedure | undefined> {
        let returnType: string | undefined;
        let parameters: ALVariable[];

        let execArray = RegExpCreator.matchWholeProcedureCall.exec(this.procedureCall as string);
        if (isNull(execArray) || isUndefined(execArray.groups)) {
            return;
        }
        if (!isUndefined(execArray.groups["returnVar"])) {
            returnType = this.getReturnTypeOfProcedureCall(execArray.groups["returnVar"]);
        }
        parameters = await this.getParametersOfProcedureCall(execArray.groups["params"], this.calledProcedureName);

        return new ALProcedure(this.calledProcedureName, parameters, returnType, this.calledALObject as ALObject);
    }
    private async getParametersOfProcedureCall(parameterCallString: string, procedureNameToCreate: string): Promise<ALVariable[]> {
        let parameters = await ALParameterParser.parseParameterCallStringToALVariableArray(parameterCallString, this.callingProcedureName as string, this.document, this.rangeOfProcedureCall);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }

    private getReturnTypeOfProcedureCall(variableNameToBeAssigned: string): string {
        let returnType = this.alVariableHandler?.getTypeOfVariable(variableNameToBeAssigned, this.callingProcedureName);
        if (isUndefined(returnType)) {
            //TODO: No Variable. Probably the Procedure Call is a parameter of another ProcedureCall
            throw new Error('Not supported yet.');
        }
        return returnType as string;
    }
    private getCalledObject(variableName: string): ALObject {

        let alVariable = this.alVariableHandler?.getALVariableByName(variableName, this.callingProcedureName);
        if (isUndefined(alVariable)) {
            throw new Error('Unexpected error.');
        }
        let alObject: ALObject | undefined = ALTypeHandler.getALObjectOfALVariableTypeWhichCanCreateProcedures(alVariable.type);
        if (isUndefined(alObject)) {
            throw new Error('Type ' + alVariable.type + 'can not create a procedure.');
        }
        return alObject as ALObject;
    }
}