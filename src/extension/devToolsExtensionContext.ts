import * as vscode from 'vscode';
import { isNullOrUndefined } from "util";

export class DevToolsExtensionContext {
    private static devToolsExtensionContext: any;
    private constructor() { }

    public static async getInstance(): Promise<any> {
        if (isNullOrUndefined(this.devToolsExtensionContext)) {
            await this.setInstance();
        }
        return this.devToolsExtensionContext;
    }

    private static async setInstance() {
        let alCodeOutlineExt = vscode.extensions.getExtension('andrzejzwierzchowski.al-code-outline');
        if (isNullOrUndefined(alCodeOutlineExt)) {
            throw new Error('AL Code Outline extension is missing.');
        }
        if (!alCodeOutlineExt.isActive) {
            await alCodeOutlineExt.activate().then(async publicApi => {
                this.devToolsExtensionContext = publicApi;
                // toolsExtensionContext.activeDocumentSymbols.setDocUri(vscode.window.activeTextEditor?.document.uri);
                // await toolsExtensionContext.activeDocumentSymbols.loadAsync(false);
                // let c = toolsExtensionContext.activeDocumentSymbols.rootSymbol.childSymbols[0];
            });
        } else {
            this.devToolsExtensionContext = alCodeOutlineExt.exports;
        }
    }
}