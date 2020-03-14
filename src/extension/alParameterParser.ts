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
    public static async parseParameterCallStringToALVariableArray(parameterCallString: string, rangeOfParameterCall: vscode.Range, procedureSymbol: any, document: vscode.TextDocument, procedureCallRange: vscode.Range): Promise<ALVariable[]> {
        let variables: ALVariable[] = [];
        if (parameterCallString === "") {
            return variables;
        }

        let parameters: vscode.Range[] = this.getParameterRangeArrayOfCallString(document, rangeOfParameterCall);
        for (let i = 0; i < parameters.length; i++) {
            let parameter: string = document.getText(parameters[i]);

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
    static getParameterRangeArrayOfCallString(document: vscode.TextDocument, rangeOfParameterCall: vscode.Range): vscode.Range[] {
        let parameterCallString = document.getText(rangeOfParameterCall);

        let parameters: vscode.Range[] = [];
        let nextParameter: string = '';
        let chars: string[] = parameterCallString.split('');
        let bracketDepth: number = 0;
        let inQuotes: boolean = false;
        let resetVariable: boolean = false;

        //TODO: Return vscode.ranges
        let startChar: number = rangeOfParameterCall.start.character;
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '"') {
                inQuotes = !inQuotes;
            }
            if (!inQuotes) {
                if (chars[i] === '(') {
                    bracketDepth += 1;
                }
                if (chars[i] === ')') {
                    bracketDepth -= 1;
                }
                if (chars[i] === ',') {
                    if (bracketDepth === 0) {
                        resetVariable = true;
                        nextParameter = nextParameter.trim();
                        if (nextParameter.length > 0) {
                            // parameters.push(nextParameter);
                        }
                    }
                }
            }
            
            nextParameter += chars[i];
            if (resetVariable) {
                resetVariable = false;
                nextParameter = '';
            }
        }
        nextParameter = nextParameter.trim();
        if (nextParameter.length > 0) {
            // parameters.push(nextParameter);
        }

        return parameters;
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