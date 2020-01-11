import * as vscode from 'vscode';
import { isNullOrUndefined } from "util";

export class ALExtension {
    private static alExtensionObject: ALExtension;
    private alExtension: any;
    private constructor(alExtension: vscode.Extension<any>) {
        this.alExtension = alExtension;
     }

    public static getInstance(): ALExtension {
        if (isNullOrUndefined(this.alExtensionObject)) {
            this.setInstance();
        }
        return this.alExtensionObject;
    }

    private static setInstance() {
        let vsCodeExtension = vscode.extensions.getExtension('microsoft.al');
        if (isNullOrUndefined(vsCodeExtension)) {
            vsCodeExtension = vscode.extensions.getExtension('ms-dynamics-smb.al');
            if (isNullOrUndefined(vsCodeExtension)) {
                throw new Error('AL Extension has to be installed.');
            }
        }
        this.alExtensionObject = new ALExtension(vsCodeExtension as vscode.Extension<any>);
    }
    
    public async activate(){
        if (!this.alExtension.isActive) {
            await this.alExtension.activate();
        }
    }
}