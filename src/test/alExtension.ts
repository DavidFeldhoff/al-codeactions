import * as vscode from 'vscode';
import { Err } from '../extension/Utils/Err';

export class ALLanguageExtension {
    private static alLanguageExtensionObject: ALLanguageExtension | undefined;
    private alLanguageExtension: any;
    private constructor(alLanguageExtension: vscode.Extension<any>) {
        this.alLanguageExtension = alLanguageExtension;
    }

    public static getInstance(): ALLanguageExtension {
        if (!this.alLanguageExtensionObject) {
            this.setInstance();
        }
        return this.alLanguageExtensionObject!;
    }

    private static setInstance() {
        let vsCodeExtension: vscode.Extension<any> | undefined = vscode.extensions.getExtension('microsoft.al');
        if (!vsCodeExtension) {
            vsCodeExtension = vscode.extensions.getExtension('ms-dynamics-smb.al');
            if (!vsCodeExtension) {
                Err._throw('AL Extension has to be installed.');
            }
        }
        this.alLanguageExtensionObject = new ALLanguageExtension(vsCodeExtension as vscode.Extension<any>);
    }

    public async activate() {
        if (!this.alLanguageExtension.isActive) {
            await this.alLanguageExtension.activate();
        }
    }
}