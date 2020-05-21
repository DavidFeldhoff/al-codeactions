import * as vscode from 'vscode';
import { CreateProcedureFactory } from '../Create Procedure/CreateProcedureFactory';
import { ICodeActionCreator } from '../Create Procedure/Code Action Creator/ICodeActionCreator';

export class ALCreateProcedureCA implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];


    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        let codeActionCreator: ICodeActionCreator | undefined = CreateProcedureFactory.getInstance(document, range);
        if (!codeActionCreator) {
            return;
        }

        if (!await codeActionCreator.considerLine()) {
            return;
        }

        let codeActions: vscode.CodeAction[] | undefined = await codeActionCreator.createCodeActions();
        return codeActions;
    }
}