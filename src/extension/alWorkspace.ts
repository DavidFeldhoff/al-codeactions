import * as vscode from 'vscode';
import { ALObject } from "./alObject";
import { isUndefined } from 'util';

export class ALWorkspace{
    public static async findDocumentOfALObject(alObject: ALObject): Promise<vscode.TextDocument | undefined> {
        let regexFirstLine = new RegExp(alObject.type + "\\s\\d+\\s\"?" + alObject.name + "\"?", "i");
        let returnDocument: vscode.TextDocument | undefined;
        await vscode.workspace.findFiles('**/*.al').then(async files => {
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                await vscode.workspace.openTextDocument(file).then(document => {
                    let firstLine = document.lineAt(0).text;
                    if (regexFirstLine.test(firstLine)) {
                        returnDocument = document;
                        return;
                    }
                });
                if (!isUndefined(returnDocument)) {
                    break;
                }
            }
        });
        return returnDocument;
    }
}