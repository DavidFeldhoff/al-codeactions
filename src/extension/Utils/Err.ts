import { window } from "vscode"

export class Err {
    public static _throw(message: string, suppressVSCodeWindow: boolean = false): never {
        if (!suppressVSCodeWindow)
            window.showErrorMessage(message)
        throw new Error(message)
    }
}