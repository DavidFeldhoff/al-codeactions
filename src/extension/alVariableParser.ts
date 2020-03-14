import * as vscode from 'vscode';
import { RegExpCreator } from "./regexpCreator";
import { isNull, isUndefined } from "util";
import { ALVariable } from "./alVariable";
import { ALParameterParser } from "./alParameterParser";
import { ALSymbolHandler } from './alSymbolHandler';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';

export class ALVariableParser {

    public static async findAllVariablesInDocument(document: vscode.TextDocument): Promise<ALVariable[]> {
        let alCodeOutlineExtension = await ALCodeOutlineExtension.getInstance();
        let api = alCodeOutlineExtension.getAPI();
        let symbols = await api.symbolsService.loadDocumentSymbols(document.uri);
        let rootSymbol = symbols.rootSymbol.childSymbols[0];
        let variables: ALVariable[] = [];
        let variableSymbols: any[] = [];
        rootSymbol.collectChildSymbols(241, variableSymbols); //241 = Variable Declaration
        for (let i = 0; i < variableSymbols.length; i++) {
            let alVariable = ALVariableParser.parseVariableSymbolToALVariable(variableSymbols[i]);
            variables.push(alVariable);
        }
        let parameterSymbols: any[] = [];
        rootSymbol.collectChildSymbols(240, parameterSymbols); //240 = Paramter
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

    public static parseFieldSymbolToALVariable(symbol: any): ALVariable {
        return new ALVariable(symbol.name, undefined, false, symbol.subtype);
        // return this.parseVariableDeclarationStringToVariable(symbol.fullName, undefined);
    }

    public static async parseVariableCallToALVariableUsingSymbols(document: vscode.TextDocument, positionOfProcedureCall: vscode.Position, variableCall: string): Promise<ALVariable | undefined> {
        //With VariableCall I mean 'Customer."No."' e.g.
        if (variableCall.includes('.')) {
            let childSymbolName = variableCall.substr(variableCall.indexOf('.') + 1);
            const alSymbolHandler = new ALSymbolHandler();
            let position = alSymbolHandler.getPositionToGetCorrectSymbolLocation(document, positionOfProcedureCall, variableCall);
            let found = await alSymbolHandler.findSymbols(document, position);
            if (found) {
                let symbol = alSymbolHandler.searchForSymbol(childSymbolName);
                if (!isUndefined(symbol)) {
                    return this.parseFieldSymbolToALVariable(symbol);
                }
            }
        }else{
            //TODO: Get the Range of the variable which should be parsed to be able to call the definitionProvider.
            // let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, positionOfCalledObject);
        }
        return undefined;
    }
}