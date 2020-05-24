import * as vscode from 'vscode';
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { AZSymbolInformation } from './AZSymbolInformation';
import { AZSymbolKind } from './azSymbolKind';
import { AZSymbolInformationExt } from '../AL Code Outline Ext/azSymbolInformationExt';

export class AZDocumentSymbolsLibrary {
    private static instances: Map<vscode.TextDocument, AZDocumentSymbolsLibrary> = new Map();
    azDocumentSymbolsLibrary: AZDocumentSymbolsLibrary;
    rootSymbol: AZSymbolInformation | undefined;
    documentContentOfCreation: string;
    private constructor(azDocumentSymbolsLibrary: AZDocumentSymbolsLibrary, currentDocumentContent: string) {
        this.azDocumentSymbolsLibrary = azDocumentSymbolsLibrary;
        this.rootSymbol = azDocumentSymbolsLibrary.rootSymbol;
        this.documentContentOfCreation = currentDocumentContent;
    }

    public static async getInstance(document: vscode.TextDocument): Promise<AZDocumentSymbolsLibrary> {
        let instance: AZDocumentSymbolsLibrary | undefined = this.instances.get(document);
        if (!instance || instance.isOutdated(document.getText())) {
            this.instances.set(document, new AZDocumentSymbolsLibrary(await this.getAZDocumentSymbolsLibrary(document), document.getText()));
        }
        return this.instances.get(document) as AZDocumentSymbolsLibrary;
    }
    private static async getAZDocumentSymbolsLibrary(document: vscode.TextDocument): Promise<AZDocumentSymbolsLibrary> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let azDocumentSymbolsLibrary: any = await azalDevTools.symbolsService.loadDocumentSymbols(document.uri);
        return azDocumentSymbolsLibrary;
    }
    public getObjectSymbol(): AZSymbolInformation | undefined {
        if (!this.rootSymbol) {
            return undefined;
        }
        let alObjectKinds: AZSymbolKind[] = [
            AZSymbolKind.TableObject,
            AZSymbolKind.TableExtensionObject,
            AZSymbolKind.PageObject,
            AZSymbolKind.PageExtensionObject,
            AZSymbolKind.PageCustomizationObject,
            AZSymbolKind.ReportObject,
            AZSymbolKind.CodeunitObject
        ];
        let alObjects: AZSymbolInformation[] = [];
        AZSymbolInformationExt.collectChildNodes(this.rootSymbol, alObjectKinds, false, alObjects);
        return alObjects.length > 0 ? alObjects[0] : undefined;
    }
    public isOutdated(documentContent: string): boolean {
        return this.documentContentOfCreation !== documentContent;
    }
}