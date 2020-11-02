import * as vscode from 'vscode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ICodeActionProvider } from './ICodeActionProvider';
import { CodeActionProviderCreateProcedureFactory } from './CodeActionProviderCreateProcedureFactory';
import { CodeActionProviderExtractProcedure } from './CodeActionProviderExtractProcedure';
import { CodeActionProviderExtractLabel } from './CodeActionProviderExtractLabel';
import { CodeActionProviderRefactorToValidate } from './CodeActionProviderRefactorToValidate';

export class CodeActionProvider_General implements vscode.CodeActionProvider {
    async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<vscode.CodeAction[] | undefined> {
        let myCodeActionProviders: ICodeActionProvider[] = [];
        myCodeActionProviders = CodeActionProviderCreateProcedureFactory.getInstances(document, range);
        myCodeActionProviders.push(new CodeActionProviderExtractProcedure(document, range));
        myCodeActionProviders.push(new CodeActionProviderExtractLabel(document, range));
        myCodeActionProviders.push(new CodeActionProviderRefactorToValidate(document, range));

        let codeActions: vscode.CodeAction[] = [];

        let myCodeActionProvidersToExecute: ICodeActionProvider[] = [];
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