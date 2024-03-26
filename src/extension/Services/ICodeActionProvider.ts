import { CodeAction, CodeActionContext } from 'vscode';

export interface ICodeActionProvider {
    considerLine(context: CodeActionContext): Promise<boolean>;
    createCodeActions(): Promise<CodeAction[]>;
}