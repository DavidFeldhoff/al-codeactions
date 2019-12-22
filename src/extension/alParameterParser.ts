import * as vscode from 'vscode';
import { ALVariable } from "./alVariable";
import { ALVariableHandler } from "./alVariableHandler";
import { ALVariableParser } from './alVariableParser';

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
    public static parseParameterCallStringToALVariableArray(parameterCallString: string, procedureName: string, document: vscode.TextDocument): ALVariable[] {
        let variables: ALVariable[] = [];
        if (parameterCallString !== "") {
            let splittedParameters = parameterCallString.split(',');
            for (let i = 0; i < splittedParameters.length; i++) {
                splittedParameters[i] = splittedParameters[i].trim();
            }

            let alVariableMgmt = new ALVariableHandler(document);
            splittedParameters.forEach(param => {
                let variable = alVariableMgmt.getALVariableByName(param, procedureName);
                variables.push(variable);
            });
        }
        return variables;
    }
}