import { window } from "vscode"

export class Err {
    public static _throw(message: string): never {
        throw new Error(message)
    }
}