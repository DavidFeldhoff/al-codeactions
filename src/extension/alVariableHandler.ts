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
        if (ALCodeOutlineExtension.isSymbolProcedureOrTrigger(symbol)) {
            let localVariables: any[] = [];
            symbol.collectChildSymbols(241, localVariables);
            if (localVariables && localVariables.length > 0) {
                localVariables.forEach(localVariable => {
                    if (localVariable.name.toLowerCase() === variableName) {
                        return ALVariableParser.parseVariableSymbolToALVariable(localVariable);
                    }
                });
            }
        }
        if (symbol.childSymbols) {
            for (let i = 0; i < symbol.childSymbols.length; i++) {
                if (symbol.childSymbols[i].kind === 235) { //235 = VarSection
                    let globalVariables: any[] = [];
                    symbol.childSymbols[i].collectChildSymbols(241, globalVariables);
                    if (globalVariables && globalVariables.length > 0) {
                        globalVariables.forEach(globalVariable => {
                            if (globalVariable.name.toLowerCase() === variableName) {
                                return ALVariableParser.parseVariableSymbolToALVariable(globalVariable);
                            }
                        });
                    }
                }
            }
        }
        return undefined;
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