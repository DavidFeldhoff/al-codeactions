import { Extension, extensions } from 'vscode';
import { Err } from '../extension/Utils/Err';

export class ALLanguageExtension {
    private static alLanguageExtensionObject: ALLanguageExtension | undefined;
    private alLanguageExtension: any;
    private constructor(alLanguageExtension: Extension<any>) {
        this.alLanguageExtension = alLanguageExtension;
    }

    public static getInstance(): ALLanguageExtension {
        if (!this.alLanguageExtensionObject) {
            this.setInstance();
        }
        return this.alLanguageExtensionObject!;
    }

    private static setInstance() {
        let vsCodeExtension: Extension<any> | undefined = extensions.getExtension('microsoft.al');
        if (!vsCodeExtension) {
            vsCodeExtension = extensions.getExtension('ms-dynamics-smb.al');
            if (!vsCodeExtension) {
                Err._throw('AL Extension has to be installed.');
            }
        }
        this.alLanguageExtensionObject = new ALLanguageExtension(vsCodeExtension as Extension<any>);
    }

    public async activate() {
        if (!this.alLanguageExtension.isActive) {
            await this.alLanguageExtension.activate();
        }
    }
}