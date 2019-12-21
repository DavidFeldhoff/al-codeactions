import * as vscode from 'vscode';
import { ProcedureCreator } from './extension/codeActionsProvider_CreateProcedure';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ProcedureCreator(), {
			providedCodeActionKinds: ProcedureCreator.providedCodeActionKinds
		})
	);
}

export function deactivate() { }