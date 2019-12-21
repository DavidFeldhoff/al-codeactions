import * as vscode from 'vscode';
import { isUndefined } from 'util';

export class ALObject {
    name: string;
    type: string;
    id: number | undefined;
    document: vscode.TextDocument | undefined;
    constructor(name: string, type: string, id?: number, document?: vscode.TextDocument) {
        this.name = name;
        this.type = type;
        if(!isUndefined(id)){
            this.id = id;
        }
        if(!isUndefined(document)){
            this.document = document;
        }
    }
}