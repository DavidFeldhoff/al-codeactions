import * as vscode from 'vscode';
import { RegExpCreator } from "./regexpCreator";
import { isNull, isUndefined } from "util";
import { ALVariable } from "./alVariable";
import { ALParameterParser } from "./alParameterParser";
import { ALSymbolHandler } from './alSymbolHandler';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';

export class ALVariableParser {

    public static async findAllVariablesInDocument(document: vscode.TextDocument): Promise<ALVariable[]> {
        let aztools = false;
        if(aztools){
            let alCodeOutlineExtension = await ALCodeOutlineExtension.getInstance();
            let api = alCodeOutlineExtension.getAPI();
            let symbols = await api.symbolsService.loadDocumentSymbols(document.uri);
            let rootSymbol = symbols.rootSymbol.childSymbols[0];
        }

        let searchVariables: boolean = false;
        let variables: ALVariable[] = [];
        let currentProcedureOrTrigger: string | undefined;
        for (let i = 0; i < document.lineCount; i++) {
            const textLine = document.lineAt(i);

            const execArray = RegExpCreator.matchProcedureOrTriggerDeclarationLine.exec(textLine.text);
            if (!isNull(execArray)) {
                currentProcedureOrTrigger = execArray[1];

                const parameterDeclarationString = execArray[2];
                const parameterArray = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, currentProcedureOrTrigger);
                parameterArray.forEach(param => {
                    variables.push(param);
                });
            }
            if (textLine.text.trim().toLowerCase() === "var") {
                searchVariables = true;
            } else if (textLine.text.trim().toLowerCase() === "begin") {
                currentProcedureOrTrigger = undefined;
                searchVariables = false;
            } else if (searchVariables) {
                if (RegExpCreator.matchVariableDeclaration.test(textLine.text.trim())) {
                    const variableDeclaration = textLine.text.trim();
                    let alVariable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclaration, currentProcedureOrTrigger);
                    variables.push(alVariable);
                }
            }
        }
        return variables;
    }

    public static parseVariableDeclarationStringToVariable(variableDeclarationString: string, procedureName: string | undefined): ALVariable {
        variableDeclarationString = variableDeclarationString.replace(/;/g, '');

        let execArray = RegExpCreator.matchVariableDeclaration.exec(variableDeclarationString);
        if (isNull(execArray) || isUndefined(execArray.groups)) {
            throw new Error("Text '" + variableDeclarationString + "' could not be resolved to a variable.");
        }
        let res = execArray.groups;

        let isLocal = !isUndefined(procedureName);
        let variableName = res["variableName"];
        let variableType = res["variableType"];
        let variableSubtype = res["variableSubtype"];
        let length = isUndefined(res["length"]) ? undefined : res["length"] as unknown as number;
        let dimensions = res["dimensions"];
        let isVar = !isUndefined(res["isVar"]);
        let isTemporary = !isUndefined(res["isTemporary"]);

        return new ALVariable(
            variableName,
            isLocal,
            procedureName,
            isVar,
            isTemporary,
            variableType,
            variableSubtype,
            length,
            dimensions);
    }

    public static async parseVariableCallToALVariableUsingSymbols(document: vscode.TextDocument, positionOfVariableCall: vscode.Position, variableCall: string): Promise<ALVariable | undefined> {
        //With VariableCall I mean 'Customer."No."' e.g.
        if (variableCall.includes('.')) {
            let childSymbolName = variableCall.substr(variableCall.indexOf('.') + 1);
            const alSymbolHandler = new ALSymbolHandler();
            let position = alSymbolHandler.getPositionToGetCorrectSymbolLocation(document, positionOfVariableCall, variableCall);
            let found = await alSymbolHandler.findSymbols(document, position);
            if (found) {
                let symbol = alSymbolHandler.searchForSymbol(childSymbolName);
                if (!isUndefined(symbol)) {
                    return this.parseFieldSymbolToALVariable(symbol);
                }
            }
        }
        return undefined;
    }

    public static parseFieldSymbolToALVariable(symbol: any): ALVariable {
        return this.parseVariableDeclarationStringToVariable(symbol.fullName, undefined);
    }
}