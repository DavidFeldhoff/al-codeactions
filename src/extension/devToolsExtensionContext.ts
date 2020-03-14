import * as vscode from 'vscode';
import * as path from 'path';
import { isNullOrUndefined } from "util";

export class ALCodeOutlineExtension {
    private static alCodeOutlineExtensionObject: ALCodeOutlineExtension;
    private alCodeOutlineExtension: any;
    private constructor(alCodeOutlineExtension: vscode.Extension<any>) {
        this.alCodeOutlineExtension = alCodeOutlineExtension;
    }

    public static async getInstance(): Promise<ALCodeOutlineExtension> {
        if (isNullOrUndefined(this.alCodeOutlineExtensionObject)) {
            this.setInstance();
        }
        await this.alCodeOutlineExtensionObject.activate();
        return this.alCodeOutlineExtensionObject;
    }

    private static setInstance() {
        let vsCodeExtension = vscode.extensions.getExtension('andrzejzwierzchowski.al-code-outline');
        if (isNullOrUndefined(vsCodeExtension)) {
            throw new Error('AL Code Outline has to be installed.');
        }
        this.alCodeOutlineExtensionObject = new ALCodeOutlineExtension(vsCodeExtension as vscode.Extension<any>);
    }

    private async activate() {
        if (!this.alCodeOutlineExtension.isActive) {
            await this.alCodeOutlineExtension.activate();
        }
    }

    public getAPI() {
        return this.alCodeOutlineExtension.exports;
    }

    
    public static async getProcedureOrTriggerSymbolOfCurrentLine(documentUri: vscode.Uri, currentLine: number): Promise<any> {
        let azALDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let symbolsLibrary = await azALDevTools.symbolsService.loadDocumentSymbols(documentUri);
        if (symbolsLibrary.rootSymbol) {
            let objectSymbol = symbolsLibrary.rootSymbol.findFirstObjectSymbol();
            if (objectSymbol && objectSymbol.childSymbols) {
                for (let i = 0; i < objectSymbol.childSymbols.length; i++) {
                    if (ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(objectSymbol.childSymbols[i].kind)) {
                        if (objectSymbol.childSymbols[i].range.start.line <= currentLine && objectSymbol.childSymbols[i].range.end.line >= currentLine) {
                            return objectSymbol.childSymbols[i];
                        }
                    }
                }
            }
        }
        throw new Error("The current procedurename was not found starting at line " + currentLine + " in file " + path.basename(documentUri.fsPath) + ".");
    }
    public static isSymbolKindProcedureOrTrigger(kind: number): boolean {
        switch (kind) {
            case 236:   //TriggerDeclaration
            case 237:   //EventTriggerDeclaration
            case 238:   //MethodDeclaration
            case 239:   //EventDeclaration
            case 50001: //LocalMethodDeclaration
                return true;
            default:
                return false;
        }
    }
}