import * as vscode from 'vscode';
import { ALCodeActionProvider } from './extension/alCodeActionProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ALCodeActionProvider(), {
			providedCodeActionKinds: ALCodeActionProvider.providedCodeActionKinds
		})
	);
}

export function deactivate() { }