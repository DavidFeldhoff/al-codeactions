import * as vscode from 'vscode';
import { isUndefined, isNull } from 'util';
import { ALVariable } from './alVariable';
import { ALVariableParser } from './alVariableParser';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';

export class ALVariableHandler {
    private variables: ALVariable[] = [];
    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }

    public async search() {
        this.variables = await ALVariableParser.findAllVariablesInDocument(this.document);
    }

    public getAllVariables(): ALVariable[] {
        return this.variables;
    }
    public getALVariableByName(variableName: string, procedureName?: string): ALVariable | undefined {
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
        return undefined;
    }
    public static getALVariableByNameOfSymbol(variableName: string, symbol?: any): ALVariable | undefined {
        if (isUndefined(symbol)) {
            return;
        }
        let variable: ALVariable | undefined;
        let objectSymbol: any = symbol;
        if (ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(symbol.kind)) {
            objectSymbol = symbol.parent;
            let localVariables: any[] = [];
            symbol.collectChildSymbols(241, localVariables);
            if (localVariables && localVariables.length > 0) {
                localVariables.forEach(localVariable => {
                    if (localVariable.name.toLowerCase() === variableName.toLowerCase()) {
                        return ALVariableParser.parseVariableSymbolToALVariable(localVariable);
                    }
                });
            }
        }
        if (objectSymbol.childSymbols) {
            let globalVarSymbols: any[] = [];
            objectSymbol.collectChildSymbols(428, globalVarSymbols);

            globalVarSymbols.forEach(globalVarSymbol => {
                let globalVariables: any[] = [];
                globalVarSymbol.collectChildSymbols(241, globalVariables); //241 = Variable
                if (globalVariables && globalVariables.length > 0) {
                    for (let i = 0; i < globalVariables.length; i++) {
                        if (globalVariables[i].name.toLowerCase() === variableName.toLowerCase()) {
                            variable = ALVariableParser.parseVariableSymbolToALVariable(globalVariables[i]);
                            break;
                        }
                    }
                }
            });
        }
        return variable;
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
}