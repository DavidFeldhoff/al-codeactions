import * as vscode from 'vscode';
import { isUndefined, isNull } from 'util';
import { ALVariable } from './alVariable';
import { ALParameterHandler } from './alParameterHandler';
import { RegExpCreator } from './regexpCreator';

export class ALVariableMgmt {
    private variables: ALVariable[] = [];
    constructor(document: vscode.TextDocument) {
        this.variables = this.getAllVariablesInCurrentDocument(document);
    }
    private getAllVariablesInCurrentDocument(document: vscode.TextDocument): ALVariable[] {
        let searchVariables: boolean = false;
        let variables: ALVariable[] = [];
        let currentProcedure: string = "";
        for (let i = 0; i < document.lineCount; i++) {
            const textLine = document.lineAt(i);

            const execArray = RegExpCreator.matchProcedureOrTriggerDeclarationLine.exec(textLine.text);
            if (!isNull(execArray)) {
                currentProcedure = execArray[1];

                const parameterDeclarationString = execArray[2];
                const parameterArray = ALParameterHandler.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, currentProcedure);
                parameterArray.forEach(param => {
                    variables.push(param);
                });
            }
            if (textLine.text.trim().toLowerCase() === "var") {
                searchVariables = true;
            } else if (textLine.text.trim().toLowerCase() === "begin") {
                currentProcedure = "";
                searchVariables = false;
            } else if (searchVariables) {
                if (RegExpCreator.matchVariableDeclaration.test(textLine.text.trim())) {
                    const variableDeclaration = textLine.text.trim();
                    let alVariable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclaration, currentProcedure);
                    variables.push(alVariable);
                }
            }
        }
        return variables;
    }
    public static parseVariableDeclarationStringToVariable(variableDeclarationString: string, procedureName: string): ALVariable {
        variableDeclarationString = variableDeclarationString.replace(/;/g, '');

        let execArray = RegExpCreator.matchVariableDeclaration.exec(variableDeclarationString);
        if (isNull(execArray) || isUndefined(execArray.groups)) {
            console.error("Variable " + variableDeclarationString + " could not be resolved.");
            throw new Error('');
        }
        let res = execArray.groups;

        let isLocal = procedureName !== "";
        let variableName = res["variableName"];
        let variableType = res["variableType"];
        let variableSubtype = res["variableSubtype"];
        let length = isUndefined(res["length"]) ? undefined : res["length"] as unknown as number;
        let dimensions = res["dimensions"];
        let isVar = !isUndefined(res["isVar"]);
        let isTemporary = !isUndefined(res["isTemporary"]);

        return new ALVariable(variableName, isLocal, procedureName, isVar, isTemporary, variableType, variableSubtype, length, dimensions);
    }


    public getAllVariables(): ALVariable[] {
        return this.variables;
    }
    getALVariableByName(variableName: string, procedureName?: string): ALVariable {
        let localVariable;
        if (!isUndefined(procedureName)) {
            localVariable = this.variables.find(v => v.isLocal === true && v.procedure === procedureName && v.name === variableName);
            if (!isUndefined(localVariable)) {
                return localVariable;
            }
        }
        const globalVariable = this.variables.find(v => v.isLocal === false && v.procedure === "" && v.name === variableName);
        if (!isUndefined(globalVariable)) {
            return globalVariable;
        }

        if (isUndefined(procedureName)) {
            throw new Error("Variable " + variableName + " not found.");
        } else {
            throw new Error("Variable " + variableName + " not found in procedure " + procedureName + ".");
        }
    }
    public getTypeOfVariable(paramName: string, procedureName?: string): string {
        let variable = this.getALVariableByName(paramName, procedureName);
        return variable.getTypeDefinition();
    }
}