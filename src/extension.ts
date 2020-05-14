import * as vscode from 'vscode';
import { ALCreateProcedureCA } from './extension/alCreateProcedureCA';
import { ALExtractToProcedureCA } from './extension/alExtractToProcedureCA';
import { RenameMgt } from './extension/renameMgt';
import { OwnConsole } from './extension/console';
import { ALCreateLabelCA } from './extension/alCreateLabelCA';

export function activate(context: vscode.ExtensionContext) {
	OwnConsole.ownConsole = vscode.window.createOutputChannel("AL CodeActions");

	console.log('Congratulations, your extension "al-codeactions" is now active!');

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
	context.subscriptions.push(
		vscode.commands.registerCommand('alcodeactions.renameMethod', () => ALExtractToProcedureCA.renameMethod())
	);
	// context.subscriptions.push(
	// 	vscode.languages.registerCodeActionsProvider('al', new ALCreateLabelCA(), {
	// 		providedCodeActionKinds: ALExtractToProcedureCA.providedCodeActionKinds
	// 	})
	// );
}


export function deactivate() { }