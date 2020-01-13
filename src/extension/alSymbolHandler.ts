import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';

export class ALSymbolHandler {
    private rootSymbol: any;
    public async findSymbols(document: vscode.TextDocument, positionToSearchForSymbols: vscode.Position): Promise<Boolean> {
        let locationList: vscode.Location[] | undefined;
        console.log("try to execute definitionprovider.");
        await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', document.uri, positionToSearchForSymbols)
            .then(async definitions => {
                console.log(" definitionprovider executed successfully.");
                if (isUndefined(definitions)) {
                    return;
                }
                for (let i = 0; i < definitions.length; i++) {
                    console.log("definitionprovider found symbols.");
                    let definition = definitions[i];

                    let alCodeOutlineExtension = ALCodeOutlineExtension.getInstance();
                    await alCodeOutlineExtension.activate();
                    let devToolsExtensionContext = alCodeOutlineExtension.getAPI();

                    let symbols = await devToolsExtensionContext.symbolsService.loadDocumentSymbols(definition.uri);
                    this.rootSymbol = symbols.rootSymbol.childSymbols[0];
                }
            });
        return !isUndefined(this.rootSymbol);
    }

    public searchForSymbol(symbolNameToSearchFor: string, symbolToSearchIn?: any): any {
        if (isUndefined(symbolToSearchIn)) {
            symbolToSearchIn = this.rootSymbol;
        }
        symbolNameToSearchFor = symbolNameToSearchFor.replace(/"/g, ""); //remove quotes
        if ((symbolToSearchIn.name as string).toLowerCase().trim() === symbolNameToSearchFor.toLowerCase().trim()) {
            return symbolToSearchIn;
        }
        if (!isUndefined(symbolToSearchIn.childSymbols)) {
            for (let i = 0; i < symbolToSearchIn.childSymbols.length; i++) {
                let childSymbol = symbolToSearchIn.childSymbols[i];
                let result = this.searchForSymbol(symbolNameToSearchFor, childSymbol);
                if (!isUndefined(result)) {
                    return result;
                }
            }
        }
        return undefined;
    }

    public getPositionToGetCorrectSymbolLocation(document: vscode.TextDocument, positionToStartSearching: vscode.Position, textToSearchFor: string): vscode.Position {
        //The command "Go to definition" has in AL a weird behaviour.
        //Customer."No." would jump to the variable declaration of Customer, if the cursor points on Customer.
        //If the cursor points on "No." it jumps directly to the declaration of "No." of the record customer.

        if (!textToSearchFor.includes('.')) {
            return positionToStartSearching;
        }
        let calledObjectName = textToSearchFor.substr(0, textToSearchFor.indexOf('.'));
        let calledFieldOrProcedureName = textToSearchFor.substr(textToSearchFor.indexOf('.') + 1);
        let textOfLine = document.lineAt(positionToStartSearching.line).text;
        let charToSearchSymbol = textOfLine.indexOf(textToSearchFor, positionToStartSearching.character) + calledObjectName.length + 1;
        let posToSearchSymbol = new vscode.Position(positionToStartSearching.line, charToSearchSymbol);
        let textInFrontOfDot = textOfLine.substr(0, posToSearchSymbol.character);
        let textOfLineBehind = textOfLine.substr(posToSearchSymbol.character);
        return posToSearchSymbol;
    }
}