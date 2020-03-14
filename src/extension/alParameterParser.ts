import * as vscode from 'vscode';
import { ALVariable } from "./alVariable";
import { ALVariableHandler } from "./alVariableHandler";
import { ALVariableParser } from './alVariableParser';
import { isUndefined } from 'util';

export class ALParameterParser {
    public static parseALVariableArrayToParameterDeclarationString(variableArray: ALVariable[]): string {
        let parameterString = '';
        for (let i = 0; i < variableArray.length; i++) {
            if (parameterString !== "") {
                parameterString += '; ';
            }
            parameterString += variableArray[i].getVariableDeclarationString();
        }
        return parameterString;
    }
    public static async parseParameterCallStringToALVariableArray(parameterCallString: string, procedureSymbol: any, document: vscode.TextDocument, procedureCallRange: vscode.Range): Promise<ALVariable[]> {
        let variables: ALVariable[] = [];
        if (parameterCallString === "") {
            return variables;
        }

        let splittedParameters = parameterCallString.split(',');
        for (let i = 0; i < splittedParameters.length; i++) {
            let parameter = splittedParameters[i].trim();

            let variable = ALVariableHandler.getALVariableByNameOfSymbol(parameter, procedureSymbol);
            if (isUndefined(variable)) {
                let variableCall = parameter; //Customer."No." e.g.
                variable = await ALVariableParser.parseVariableCallToALVariableUsingSymbols(document, procedureCallRange.start, variableCall);
            }
            if (isUndefined(variable)) {
                variable = ALParameterParser.createVariantVariable(variables);
            }
            variables.push(variable);
        }
        return variables;
    }

    private static createVariantVariable(variables: ALVariable[]) {
        let variableName: string;
        let variableNameUnique = true;
        let i = 0;
        do {
            variableName = String.fromCharCode(97 + i++);
            variables.forEach(variable => {
                variableNameUnique = variable.name.toLowerCase() !== variableName;
            });
        } while (!variableNameUnique);
        return new ALVariable(variableName, undefined, false, 'Variant');
    }
}