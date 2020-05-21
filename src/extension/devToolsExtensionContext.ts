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

    public static async getFirstObjectSymbolOfDocumentUri(documentUri: vscode.Uri): Promise<any> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let symbolsLibraryCalledObject: any = await azalDevTools.symbolsService.loadDocumentSymbols(documentUri);
        return symbolsLibraryCalledObject.rootSymbol.findFirstObjectSymbol();
    }

    public static async getProcedureOrTriggerSymbolOfCurrentLine(documentUri: vscode.Uri, currentLine: number): Promise<any> {
        let azALDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let symbolsLibrary = await azALDevTools.symbolsService.loadDocumentSymbols(documentUri);
        if (symbolsLibrary.rootSymbol) {
            let objectSymbol = symbolsLibrary.rootSymbol.findFirstObjectSymbol();
            let triggerOrProcedureKinds: number[] = this.getProcedureOrTriggerKinds();
            for (let x = 0; x < triggerOrProcedureKinds.length; x++) {
                let objectsOfKindX: any[] = [];
                objectSymbol.collectChildSymbols(triggerOrProcedureKinds[x], true, objectsOfKindX);
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
        return kind === 412;
    }
    public static isSymbolKindTableExtension(kind: number): boolean {
        return kind === 413;
    }
    static isSymbolKindPage(kind: number): boolean {
        return kind === 414;
    }
    static isSymbolKindPageExtension(kind: number): boolean {
        return kind === 415;
    }
    static isSymbolKindPageCustomization(kind: number): boolean {
        return kind === 421;
    }
    static isSymbolKindReport(kind: number): boolean {
        return kind === 416;
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
        kinds.push(50037); //EventSubscriber
        kinds.push(50038); //Test-Functions
        kinds.push(50039); //ConfirmHandlerDeclaration
        kinds.push(50040); //FilterPageHandlerDeclaration
        kinds.push(50041); //HyperlinkHandlerDeclaration
        kinds.push(50042); //MessageHandlerDeclaration
        kinds.push(50043); //ModalPageHandlerDeclaration
        kinds.push(50044); //PageHandlerDeclaration
        kinds.push(50045); //ReportHandlerDeclaration
        kinds.push(50046); //RequestPageHandlerDeclaration
        kinds.push(50047); //SendNotificationHandlerDeclaration
        kinds.push(50048); //SessionSettingsHandlerDeclaration
        kinds.push(50049); //StrMenuHandlerDeclaration
        return kinds;
    }
}