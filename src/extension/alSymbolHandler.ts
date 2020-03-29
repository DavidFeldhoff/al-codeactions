import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';

export class ALSymbolHandler {
    private rootSymbol: any;
    private lastUri: vscode.Uri | undefined;

    public async findSymbol(document: vscode.TextDocument, positionToSearchForSymbols: vscode.Position, symbolName: string): Promise<any | undefined> {
        let searchedSymbol: any | undefined;
        this.lastUri = undefined;
        await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', document.uri, positionToSearchForSymbols)
            .then(async definitions => {
                if (isUndefined(definitions)) {
                    return;
                }
                for (let i = 0; i < definitions.length; i++) {
                    let definition = definitions[i];
                    this.lastUri = definition.uri;

                    let alCodeOutlineExtension = await ALCodeOutlineExtension.getInstance();
                    let devToolsExtensionContext = alCodeOutlineExtension.getAPI();

                    let symbols = await devToolsExtensionContext.symbolsService.loadDocumentSymbols(definition.uri);
                    this.rootSymbol = symbols.rootSymbol.childSymbols[0];
                    if (this.rootSymbol.childSymbols) {
                        searchedSymbol = this.searchForSymbol(symbolName, definition.range);
                    }
                }
            });
        return searchedSymbol;
    }

    public searchForSymbol(symbolNameToSearchFor: string, range?: vscode.Range): any {
        return this.searchForSymbolDetail(symbolNameToSearchFor, this.rootSymbol, range);
    }
    private searchForSymbolDetail(symbolNameToSearchFor: string, symbolToSearchIn: any, range?: vscode.Range): any {
        if (isUndefined(symbolToSearchIn)) {
            symbolToSearchIn = this.rootSymbol;
        }
        symbolNameToSearchFor = symbolNameToSearchFor.replace(/"/g, ""); //remove quotes
        if ((symbolToSearchIn.name as string).toLowerCase().trim() === symbolNameToSearchFor.toLowerCase().trim()) {
            if (range) {
                let symbolRange: vscode.Range = new vscode.Range(symbolToSearchIn.range.start.line, symbolToSearchIn.range.start.character, symbolToSearchIn.range.end.line, symbolToSearchIn.range.end.character);
                let validRange: boolean = symbolRange.contains(range);
                if (!validRange) {
                    validRange = Math.abs(symbolRange.start.line - range.start.line) < 2;
                }
                if (validRange) {
                    return symbolToSearchIn;
                }
            } else {
                return symbolToSearchIn;
            }
        }
        if (!isUndefined(symbolToSearchIn.childSymbols)) {
            for (let i = 0; i < symbolToSearchIn.childSymbols.length; i++) {
                let childSymbol = symbolToSearchIn.childSymbols[i];
                let result = this.searchForSymbolDetail(symbolNameToSearchFor, childSymbol, range);
                if (!isUndefined(result)) {
                    return result;
                }
            }
        }
        return undefined;
    }
    public getLastUri(): vscode.Uri | undefined {
        return this.lastUri;
    }
}