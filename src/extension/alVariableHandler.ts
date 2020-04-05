import * as vscode from 'vscode';
import { isUndefined } from 'util';
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
            symbol.collectChildSymbols(241, true, localVariables);
            if (localVariables && localVariables.length > 0) {
                for (let i = 0; i < localVariables.length; i++) {
                    let localVariable = localVariables[i];
                    let localVariableName = localVariable.name;
                    if(!ALVariableHandler.hasQuotes(variableName) && ALVariableHandler.hasQuotes(localVariableName)){
                        variableName = '"' + variableName + '"';
                    }
                    if(ALVariableHandler.hasQuotes(variableName) && !ALVariableHandler.hasQuotes(localVariableName)){
                        localVariableName = '"' + localVariableName + '"';
                    }
                    if (localVariableName.toLowerCase() === variableName.toLowerCase()) {
                        return ALVariableParser.parseVariableSymbolToALVariable(localVariable);
                    }
                }
            }
        }
        if (objectSymbol.childSymbols) {
            let globalVarSymbols: any[] = [];
            objectSymbol.collectChildSymbols(428, true, globalVarSymbols);

            globalVarSymbols.forEach(globalVarSymbol => {
                let globalVariables: any[] = [];
                globalVarSymbol.collectChildSymbols(241, true, globalVariables); //241 = Variable
                if (globalVariables && globalVariables.length > 0) {
                    for (let i = 0; i < globalVariables.length; i++) {
                        let globalVariableName = globalVariables[i].name;
                        if(!ALVariableHandler.hasQuotes(variableName) && ALVariableHandler.hasQuotes(globalVariableName)){
                            variableName = '"' + variableName + '"';
                        }
                        if(ALVariableHandler.hasQuotes(variableName) && !ALVariableHandler.hasQuotes(globalVariableName)){
                            globalVariableName = '"' + globalVariableName + '"';
                        }   
                        if (globalVariableName.toLowerCase() === variableName.toLowerCase()) {
                            variable = ALVariableParser.parseVariableSymbolToALVariable(globalVariables[i]);
                            break;
                        }
                    }
                }
            });
        }
        return variable;
    }
    static hasQuotes(text: string): boolean {
        text = text.trim();
        return text.startsWith('"') && text.endsWith('"');
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