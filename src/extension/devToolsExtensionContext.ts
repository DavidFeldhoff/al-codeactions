import { Extension, extensions } from 'vscode';
import { Err } from './Utils/Err';

export class ALCodeOutlineExtension {
    private static alCodeOutlineExtensionObject: ALCodeOutlineExtension | undefined;
    private alCodeOutlineExtension: any;
    private constructor(alCodeOutlineExtension: Extension<any>) {
        this.alCodeOutlineExtension = alCodeOutlineExtension;
    }

    public static async getInstance(): Promise<ALCodeOutlineExtension> {
        if (!this.alCodeOutlineExtensionObject) {
            this.setInstance();
        }
        await this.alCodeOutlineExtensionObject!.activate();
        return this.alCodeOutlineExtensionObject!;
    }

    private static setInstance() {
        let vsCodeExtension: Extension<any> | undefined = extensions.getExtension('andrzejzwierzchowski.al-code-outline');
        if (!vsCodeExtension) {
            Err._throw('AL Code Outline has to be installed.');
        }
        this.alCodeOutlineExtensionObject = new ALCodeOutlineExtension(vsCodeExtension as Extension<any>);
    }

    private async activate() {
        if (!this.alCodeOutlineExtension.isActive) {
            await this.alCodeOutlineExtension.activate();
        }
    }

    public getAPI() {
        return this.alCodeOutlineExtension.exports;
    }

}