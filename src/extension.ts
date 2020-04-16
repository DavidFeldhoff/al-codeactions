import * as vscode from 'vscode';
import { ALCreateProcedureCA } from './extension/alCreateProcedureCA';
import { ALExtractToProcedureCA } from './extension/alExtractToProcedureCA';
import { RenameMgt } from './extension/checkRename';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	RenameMgt.getInstance();
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ALCreateProcedureCA(), {
			providedCodeActionKinds: ALCreateProcedureCA.providedCodeActionKinds
		})
	);
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ALExtractToProcedureCA(), {
			providedCodeActionKinds: ALExtractToProcedureCA.providedCodeActionKinds
		})
	);
}

export function deactivate() { }