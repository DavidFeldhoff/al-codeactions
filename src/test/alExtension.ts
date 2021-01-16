import * as vscode from 'vscode';
import { isNullOrUndefined } from "util";
import { Err } from '../extension/Utils/Err';

export class ALLanguageExtension {
    private static alLanguageExtensionObject: ALLanguageExtension;
    private alLanguageExtension: any;
    private constructor(alLanguageExtension: vscode.Extension<any>) {
        this.alLanguageExtension = alLanguageExtension;
     }

    public static getInstance(): ALLanguageExtension {
        if (isNullOrUndefined(this.alLanguageExtensionObject)) {
            this.setInstance();
        }
        return this.alLanguageExtensionObject;
    }

    private static setInstance() {
        let vsCodeExtension = vscode.extensions.getExtension('microsoft.al');
        if (isNullOrUndefined(vsCodeExtension)) {
            vsCodeExtension = vscode.extensions.getExtension('ms-dynamics-smb.al');
            if (isNullOrUndefined(vsCodeExtension)) {
                Err._throw('AL Extension has to be installed.');
            }
        }
        this.alLanguageExtensionObject = new ALLanguageExtension(vsCodeExtension as vscode.Extension<any>);
    }
    
    public async activate(){
        if (!this.alLanguageExtension.isActive) {
            await this.alLanguageExtension.activate();
        }
    }
}