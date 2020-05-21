import * as vscode from 'vscode';

export class ALObject {
    public name: string;
    public type: string;
    public id: number;
    public documentUri: vscode.Uri;
    constructor(name: string, type: string, id: number, documentUri: vscode.Uri) {
        this.name = name;
        this.type = type;
        this.id = id;
        this.documentUri = documentUri;
    }
}