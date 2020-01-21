import * as vscode from 'vscode';
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

    private async activate(){
        if (!this.alCodeOutlineExtension.isActive) {
            await this.alCodeOutlineExtension.activate();
        }
    }

    public getAPI(){
        return this.alCodeOutlineExtension.exports;
    }
}