import * as vscode from 'vscode';

export interface WithDocumentFixer {
    addDocument(uri: vscode.Uri): void;
    fixWithUsagesOfAllDocuments(): Promise<void>;
}