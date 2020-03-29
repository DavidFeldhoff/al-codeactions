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
            let triggerOrProcedureKinds: number[] = this.getProcedureOrTriggerKinds();
            for (let x = 0; x < triggerOrProcedureKinds.length; x++) {
                let objectsOfKindX: any[] = [];
                objectSymbol.collectChildSymbols(triggerOrProcedureKinds[x], objectsOfKindX);
                if (objectsOfKindX && objectsOfKindX.length > 0) {
                    for (let i = 0; i < objectsOfKindX.length; i++) {
                        if (objectsOfKindX[i].range.start.line <= currentLine && objectsOfKindX[i].range.end.line >= currentLine) {
                            return objectsOfKindX[i];
                        }
                    }
                }
            }
        }
        throw new Error("The current procedurename was not found starting at line " + currentLine + " in file " + path.basename(documentUri.fsPath) + ".");
    }
    public static isSymbolKindProcedureOrTrigger(kind: number): boolean {
        return this.getProcedureOrTriggerKinds().includes(kind);
    }
    public static isSymbolKindVariableOrParameter(kind: number): boolean {
        switch (kind) {
            case 240:   //Parameter
            case 241:   //Variable
                return true;
            default:
                return false;
        }
    }
    public static isSymbolKindTable(kind: number): boolean {
        switch (kind) {
            case 412: //TableObject
            case 413: //TableExtension
                return true;
            default:
                return false;
        }
    }
    public static isSymbolKindTableField(kind: number): boolean {
        switch (kind) {
            case 260:   //TableField
                return true;
            default:
                return false;
        }
    }
    private static getProcedureOrTriggerKinds(): number[] {
        let kinds: number[] = [];
        kinds.push(236); //TriggerDeclaration
        kinds.push(237); //EventTriggerDeclaration
        kinds.push(238); //MethodDeclaration
        kinds.push(239); //EventDeclaration
        kinds.push(50001); //LocalMethodDeclaration
        return kinds;
    }
}