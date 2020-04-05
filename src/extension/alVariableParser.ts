import * as vscode from 'vscode';
import { isUndefined } from "util";
import { ALVariable } from "./alVariable";
import { ALSymbolHandler } from './alSymbolHandler';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { DocumentUtils } from './documentUtils';
import { ALParameterParser } from './alParameterParser';

export class ALVariableParser {
    public static async findAllVariablesInDocument(document: vscode.TextDocument): Promise<ALVariable[]> {
        let alCodeOutlineExtension = await ALCodeOutlineExtension.getInstance();
        let api = alCodeOutlineExtension.getAPI();
        let symbols = await api.symbolsService.loadDocumentSymbols(document.uri);
        let rootSymbol = symbols.rootSymbol.childSymbols[0];
        let variables: ALVariable[] = [];
        let variableSymbols: any[] = [];
        rootSymbol.collectChildSymbols(241, true, variableSymbols); //241 = Variable Declaration
        for (let i = 0; i < variableSymbols.length; i++) {
            let alVariable = ALVariableParser.parseVariableSymbolToALVariable(variableSymbols[i]);
            variables.push(alVariable);
        }
        let parameterSymbols: any[] = [];
        rootSymbol.collectChildSymbols(240, true, parameterSymbols); //240 = Paramter
        for (let i = 0; i < parameterSymbols.length; i++) {
            let alVariable = ALVariableParser.parseParameterSymbolToALVariable(parameterSymbols[i]);
            variables.push(alVariable);
        }
        return variables;
        //fullName = PreviewMode: Boolean, name = PreviewMode
        //method.fullName = Post(document), method.name = Post
        //parent.parent.kind == 236 == trigger, 238 = method
    }
    static parseVariableSymbolToALVariable(variableSymbol: any): ALVariable {
        let procedureOrTriggerName: string | undefined;
        if (ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(variableSymbol.parent.parent.kind)) {
            procedureOrTriggerName = variableSymbol.parent.parent.name;
        }
        return new ALVariable(variableSymbol.name, procedureOrTriggerName, false, variableSymbol.subtype);
    }
    static parseParameterSymbolToALVariable(parameterSymbol: any): ALVariable {
        let procedureOrTriggerName: string | undefined;
        let parameterDeclaration = parameterSymbol.fullName.trim();
        let isVar: boolean = false;
        switch (parameterSymbol.parent.parent.kind) {
            case 236:
            case 237:
            case 238:
            case 239:
            case 50001:
                procedureOrTriggerName = parameterSymbol.parent.parent.name;
                let declarationLine: string = parameterSymbol.parent.parent.fullName;
                if (declarationLine.includes('var ' + parameterDeclaration)) {
                    parameterDeclaration = 'var ' + parameterDeclaration;
                }
                isVar = true;
                break;
            default:
                procedureOrTriggerName = undefined;
                break;
        }
        let alVariable = new ALVariable(parameterSymbol.name, procedureOrTriggerName, isVar, parameterSymbol.subtype);
        // let alVariable = ALVariableParser.parseVariableDeclarationStringToVariable(parameterDeclaration, procedureOrTriggerName);
        return alVariable;
    }

    public static async parseFieldSymbolToALVariable(symbol: any, uri?: vscode.Uri): Promise<ALVariable> {
        if (!symbol.subtype) {
            if (ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(symbol.kind)) {
                let lastBracketPos = symbol.fullName.lastIndexOf(')');
                let colonPos = symbol.fullName.indexOf(':', lastBracketPos);
                if (colonPos > 0) {
                    symbol.subtype = symbol.fullName.substr(colonPos + 1).trim();
                }
                symbol.name = "arg";
            } else {
                if (ALCodeOutlineExtension.isSymbolKindTableField(symbol.kind) && symbol.fullName.trim().endsWith("Option") && uri) {
                    // expand range due to a cut off in the al code outline extension
                    let document: vscode.TextDocument = await vscode.workspace.openTextDocument(uri);
                    let rangeOptionValues: vscode.Range = new vscode.Range(symbol.selectionRange.end.line, symbol.selectionRange.end.character, symbol.selectionRange.end.line, document.lineAt(symbol.selectionRange.end.line).range.end.character);
                    let textOptionValues = document.getText(rangeOptionValues);
                    textOptionValues = textOptionValues.substr(textOptionValues.indexOf('Option') + 'Option'.length);
                    textOptionValues = textOptionValues.substr(0, textOptionValues.lastIndexOf(')'));
                    symbol.fullName = symbol.fullName.trim() + textOptionValues;
                }
                symbol.subtype = this.getTypeOfVariableDeclaration(symbol.fullName);
            }
        }
        return new ALVariable(symbol.name, undefined, false, symbol.subtype);
    }

    public static async parseVariableCallToALVariableUsingSymbols(document: vscode.TextDocument, variableCallRange: vscode.Range): Promise<ALVariable | undefined> {
        let variableCall: string = document.getText(variableCallRange);
        //With VariableCall I mean 'Customer."No."' e.g.
        if (variableCall.includes('.')) {
            let objectRange: vscode.Range | undefined = DocumentUtils.getNextWordRange(document, variableCallRange);
            if (!objectRange) {
                throw new Error('Unexpected Error in parseVariableCallToALVariableUsingSymbols with ' + document.getText(variableCallRange));
            }
            let childNameRange = DocumentUtils.getNextWordRange(document, variableCallRange, objectRange.end.translate(0, 1));
            if (!childNameRange) {
                throw new Error('Unexpected Error in parseVariableCallToALVariableUsingSymbols with ' + document.getText(variableCallRange));
            }
            const alSymbolHandler = new ALSymbolHandler();
            let searchedSymbol = await alSymbolHandler.findSymbol(document, childNameRange?.start, document.getText(childNameRange));
            if (!isUndefined(searchedSymbol)) {
                let uri = alSymbolHandler.getLastUri() as vscode.Uri;
                let alVariable: ALVariable = await this.parseFieldSymbolToALVariable(searchedSymbol, uri);
                return alVariable;
            }
        } else {
            const alSymbolHandler = new ALSymbolHandler();
            let nameRange = DocumentUtils.getNextWordRange(document, variableCallRange);
            if (!nameRange) {
                throw new Error('Unexpected Error in parseVariableCallToALVariableUsingSymbols with ' + document.getText(variableCallRange));
            }
            let searchedSymbol = await alSymbolHandler.findSymbol(document, variableCallRange.start, document.getText(nameRange));
            if (!isUndefined(searchedSymbol)) {
                let uri = alSymbolHandler.getLastUri() as vscode.Uri;
                let alVariable: ALVariable = await this.parseFieldSymbolToALVariable(searchedSymbol, uri);
                return alVariable;
            }
        }
        return undefined;
    }
    static parsePrimitiveTypes(document: vscode.TextDocument, variableCallRange: vscode.Range): ALVariable | undefined {
        let alVariable: ALVariable | undefined;
        let variableCall: string = document.getText(variableCallRange);
        if (variableCall.startsWith('\'') && variableCall.endsWith('\'')) {
            alVariable = new ALVariable('arg', undefined, false, 'Text');
        } else if (variableCall.trim().toLowerCase() === "true" || variableCall.trim().toLowerCase() === "false") {
            alVariable = new ALVariable('arg', undefined, false, 'Boolean');
        } else {
            let number = Number(variableCall);
            if (isNaN(number)) {
                return undefined;
            } else if (Number.isInteger(number)) {
                alVariable = new ALVariable('arg', undefined, false, 'Integer');
            } else {
                alVariable = new ALVariable('arg', undefined, false, 'Decimal');
            }
        }
        return alVariable;
    }

    public static getTypeOfVariableDeclaration(variableDeclaration: string): string {
        let variableName = DocumentUtils.getNextWord(variableDeclaration);
        let colonPos = variableDeclaration.indexOf(':', variableName?.length);
        let type = variableDeclaration.substring(colonPos + 1);
        type = type.trim();
        if (type.charAt(type.length - 1) === ';') {
            type = type.substr(0, type.length - 1);
        }
        return type;
    }
}