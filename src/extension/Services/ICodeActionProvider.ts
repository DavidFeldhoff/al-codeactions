import * as vscode from 'vscode';

export interface ICodeActionProvider {
    considerLine(): Promise<boolean>;
    createCodeActions(): Promise<vscode.CodeAction[]>;
}