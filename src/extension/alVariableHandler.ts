import * as vscode from 'vscode';
import { isUndefined, isNull } from 'util';
import { ALVariable } from './alVariable';
import { ALParameterParser } from './alParameterParser';
import { RegExpCreator } from './regexpCreator';
import { ALVariableParser } from './alVariableParser';

export class ALVariableHandler {
    private variables: ALVariable[] = [];
    document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
        this.variables = ALVariableParser.findAllVariablesInDocument(this.document);
    }

    public getAllVariables(): ALVariable[] {
        return this.variables;
    }
    public getALVariableByName(variableName: string, procedureName?: string): ALVariable {
        if (!isUndefined(procedureName)) {
            let localVariable = this.getLocalVariableByName(procedureName, variableName);
            if (!isUndefined(localVariable)) {
                return localVariable;
            }
        }

        const globalVariable = this.getGlobalVariableByName(variableName);
        if (!isUndefined(globalVariable)) {
            return globalVariable;
        }

        throw new Error("Variable " + variableName + " not found" + isUndefined(procedureName)? "": " in procedure " + procedureName + " in file " + this.document.fileName + ".");
    }
    private getGlobalVariableByName(variableName: string) {
        return this.variables.find(v => 
            v.isLocal === false &&
            isUndefined(v.procedure) &&
            v.name === variableName);
    }

    private getLocalVariableByName(procedureName: string, variableName: string): ALVariable | undefined {
        let localVariable = this.variables.find(v => 
            v.isLocal === true &&
            v.procedure === procedureName &&
            v.name === variableName);
        return localVariable;
    }

    public getTypeOfVariable(paramName: string, procedureName?: string): string {
        let variable = this.getALVariableByName(paramName, procedureName);
        return variable.getTypeDefinition();
    }
}