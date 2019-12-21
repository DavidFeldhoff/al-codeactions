import * as vscode from 'vscode';

export class ALObject {
    name: string;
    type: string;
    id: number | undefined;
    document: vscode.TextDocument | undefined;
    constructor(name: string, type: string, id?: number, document?: vscode.TextDocument) {
        this.name = name;
        this.type = type;
        this.id = id;
        this.document = document;
    }
}