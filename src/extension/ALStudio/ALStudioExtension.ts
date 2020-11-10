import { Extension, extensions, TextDocument } from "vscode";

export class ALStudioExtension {
    static isAvailable(): boolean {
        return extensions.getExtension('dynasist.al-studio') !== undefined;
    }
}