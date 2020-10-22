import * as vscode from 'vscode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ICodeActionCreator } from '../Create Procedure/Code Action Creator/ICodeActionCreator';
import { CodeActionProviderCreateProcedureFactory } from '../Create Procedure/CodeActionCreatorFactory';
import { CodeActionProviderExtractProcedure } from './alExtractToProcedureCodeAction';
import { CodeActionProviderExtractLabel } from './CodeActionProviderExtractLabel';

export class ALCodeActionProvider implements vscode.CodeActionProvider {
    async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<vscode.CodeAction[] | undefined> {
        let myCodeActionProviders: ICodeActionCreator[] = [];
        myCodeActionProviders = CodeActionProviderCreateProcedureFactory.getInstances(document, range);
        myCodeActionProviders.push(new CodeActionProviderExtractProcedure(document, range));
        myCodeActionProviders.push(new CodeActionProviderExtractLabel(document, range));

        let codeActions: vscode.CodeAction[] = [];

        let myCodeActionProvidersToExecute: ICodeActionCreator[] = [];
        for (const myCodeActionProvider of myCodeActionProviders) {
            if (await myCodeActionProvider.considerLine()) {
                myCodeActionProvidersToExecute.push(myCodeActionProvider);
            }
        }
        if (myCodeActionProvidersToExecute.length > 0) {
            await SyntaxTree.getInstance(document);
            for (const myCodeActionProviderToExecute of myCodeActionProvidersToExecute) {
                let newActions: vscode.CodeAction[] = await myCodeActionProviderToExecute.createCodeActions();
                codeActions = codeActions.concat(newActions);
            }
        }
        return codeActions;
    }
}