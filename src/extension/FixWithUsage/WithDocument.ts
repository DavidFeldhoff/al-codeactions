import * as vscode from 'vscode';

export class WithDocument {
    uri: vscode.Uri;
    document: vscode.TextDocument | undefined;
    constructor(uri: vscode.Uri) {
        this.uri = uri;
    }
    getAL0604Warnings(): vscode.Diagnostic[] {
        return vscode.languages.getDiagnostics(this.uri).filter(d => d.code && d.code === 'AL0604');
    }
    getAL0606Warnings(): vscode.Diagnostic[] {
        return vscode.languages.getDiagnostics(this.uri).filter(d => d.code && d.code === 'AL0606');
    }
    async openTextDocument() {
        this.document = await vscode.workspace.openTextDocument(this.uri);
    }
    getDocument(): vscode.TextDocument {
        if (!this.document) {
            throw new Error('Please open the document first.');
        }
        return this.document;
    }
}