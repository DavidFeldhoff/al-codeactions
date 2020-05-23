import * as vscode from 'vscode';
import { CreateProcedureFactory } from '../Create Procedure/CreateProcedureFactory';
import { ICodeActionCreator } from '../Create Procedure/Code Action Creator/ICodeActionCreator';

export class ALCreateProcedureCA implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];


    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        let codeActionCreators: ICodeActionCreator[] = CreateProcedureFactory.getInstances(document, range);
        let codeActions: vscode.CodeAction[] = [];
        for (let i = 0; i < codeActionCreators.length; i++) {
            if (!await codeActionCreators[i].considerLine()) {
                return;
            }
            let newActions: vscode.CodeAction[] = await codeActionCreators[i].createCodeActions();
            codeActions = codeActions.concat(newActions);
        }
        return codeActions;
    }
}