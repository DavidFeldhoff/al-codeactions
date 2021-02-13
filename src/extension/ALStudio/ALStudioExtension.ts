import { Extension, extensions } from "vscode";
import { alstudio } from "./api";

export class ALStudioExtension {
    static isAvailable(): boolean {
        return extensions.getExtension('dynasist.al-studio') !== undefined;
    }

    static async getAlStudioAPI(): Promise<alstudio.IExternalAPIService | undefined> {
        let alStudio: Extension<any> = extensions.getExtension('dynasist.al-studio')!;
        if (alStudio) {
            if (!alStudio.isActive) {
                await alStudio.activate();
            }

            return alStudio.exports as alstudio.IExternalAPIService;
        }
    }
}