import * as vscode from 'vscode';
import { ALCreateProcedureCA } from './extension/alCreateProcedureCA';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ALCreateProcedureCA(), {
			providedCodeActionKinds: ALCreateProcedureCA.providedCodeActionKinds
		})
	);
}

export function deactivate() { }