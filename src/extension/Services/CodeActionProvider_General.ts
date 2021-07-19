import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ICodeActionProvider } from './ICodeActionProvider';
import { CodeActionProviderCreateProcedureFactory } from './CodeActionProviderCreateProcedureFactory';
import { CodeActionProviderExtractProcedure } from './CodeActionProviderExtractProcedure';
import { CodeActionProviderExtractLabel } from './CodeActionProviderExtractLabel';
import { CodeActionProviderRefactorToValidate } from './CodeActionProviderRefactorToValidate';
import { CodeActionProviderLocalVariableToGlobal } from './CodeActionProviderLocalVariableToGlobal';
import { CodeActionProvider, TextDocument, Range, CodeActionContext, CancellationToken, CodeAction } from 'vscode';
import { CodeActionProviderModifyProcedureDeclaration } from './CodeActionProviderModifyProcedureDeclaration';

export class CodeActionProvider_General implements CodeActionProvider {
    async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext, token: CancellationToken): Promise<CodeAction[] | undefined> {
        let myCodeActionProviders: ICodeActionProvider[] = [];
        myCodeActionProviders = CodeActionProviderCreateProcedureFactory.getInstances(document, range);
        myCodeActionProviders.push(new CodeActionProviderExtractProcedure(document, range));
        myCodeActionProviders.push(new CodeActionProviderExtractLabel(document, range));
        myCodeActionProviders.push(new CodeActionProviderRefactorToValidate(document, range));
        myCodeActionProviders.push(new CodeActionProviderLocalVariableToGlobal(document, range));
        myCodeActionProviders.push(new CodeActionProviderModifyProcedureDeclaration(document, range));

        let codeActions: CodeAction[] = [];

        let myCodeActionProvidersToExecute: ICodeActionProvider[] = [];
        for (const myCodeActionProvider of myCodeActionProviders) {
            if (await myCodeActionProvider.considerLine()) {
                myCodeActionProvidersToExecute.push(myCodeActionProvider);
            }
        }
        if (myCodeActionProvidersToExecute.length > 0) {
            await SyntaxTree.getInstance(document);
            for (const myCodeActionProviderToExecute of myCodeActionProvidersToExecute) {
                let newActions: CodeAction[] = await myCodeActionProviderToExecute.createCodeActions();
                codeActions = codeActions.concat(newActions);
            }
            for (const codeAction of codeActions)
                codeAction.title += ' (AL CodeActions)';
        }
        return codeActions;
    }
}