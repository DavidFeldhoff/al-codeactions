import * as vscode from 'vscode';

export class ALObject {
    public name: string;
    public type: string;
    public id: number | undefined;
    public document: vscode.TextDocument | undefined;
    constructor(name: string, type: string, id?: number, document?: vscode.TextDocument) {
        this.name = name;
        this.type = type;
        this.id = id;
        this.document = document;
    }
}