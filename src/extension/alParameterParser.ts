import * as vscode from 'vscode';
import { ALVariable } from "./alVariable";
import { ALVariableHandler } from "./alVariableHandler";
import { ALVariableParser } from './alVariableParser';
import { isUndefined } from 'util';

export class ALParameterParser {
    public static parseParameterDeclarationStringToALVariableArray(parameterString: string, procedureName: string): ALVariable[] {
        let variables: ALVariable[] = [];
        if (parameterString !== "") {
            let splittedParameters = parameterString.split(';');
            for (let i = 0; i < splittedParameters.length; i++) {
                splittedParameters[i] = splittedParameters[i].trim();
            }
            splittedParameters.forEach(param => {
                let variable = ALVariableParser.parseVariableDeclarationStringToVariable(param, procedureName);
                variables.push(variable);
            });
        }
        return variables;
    }
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
    public static async parseParameterCallStringToALVariableArray(parameterCallString: string, procedureName: string, document: vscode.TextDocument, procedureCallRange: vscode.Range): Promise<ALVariable[]> {
        let variables: ALVariable[] = [];
        if (parameterCallString === "") {
            return variables;
        }

        let alVariableMgmt = new ALVariableHandler(document);
        let splittedParameters = parameterCallString.split(',');
        for (let i = 0; i < splittedParameters.length; i++) {
            let param = splittedParameters[i].trim();

            let variable = alVariableMgmt.getALVariableByName(param, procedureName);
            if (isUndefined(variable)) {
                let variableCall = param; //Customer."No." e.g.
                variable = await ALVariableParser.parseVariableCallToALVariableUsingSymbols(document, procedureCallRange.start, variableCall);
            }
            if (isUndefined(variable)) {
                let variableName : string;
                let variableNameUnique = true;
                let i = 0;
                do {
                    variableName = String.fromCharCode(97 + i++);
                    variables.forEach(variable => {
                        variableNameUnique = variable.name.toLowerCase() !== variableName;
                    });
                } while (!variableNameUnique);
                variable = new ALVariable(variableName, false, '', false, false, 'Variant');
            }
            variables.push(variable);
        }
        return variables;
    }
}