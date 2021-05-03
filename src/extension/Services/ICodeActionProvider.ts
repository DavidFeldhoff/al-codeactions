import { CodeAction } from 'vscode';

export interface ICodeActionProvider {
    considerLine(): Promise<boolean>;
    createCodeActions(): Promise<CodeAction[]>;
}