import * as vscode from 'vscode';
import { ALCreateProcedureCA } from './extension/Code Actions/alCreateProcedureCA';
import { ALExtractToProcedureCA } from './extension/Code Actions/alExtractToProcedureCA';
import { OwnConsole } from './extension/console';
import { ALCreateHandlerFunctionReferenceProvider } from './extension/Code Actions/alCreateHandlerFunctionReferenceProvider';
import { ALCreateHandlerFunctionDefinitionProvider } from './extension/Code Actions/alCreateHandlerFunctionDefinitionProvider';
import { ALCreateTriggerParameterReferenceProvider } from './extension/Code Actions/alCreateTriggerParameterReferenceProvider';

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
	context.subscriptions.push(
		vscode.languages.registerReferenceProvider('al', new ALCreateHandlerFunctionReferenceProvider())
	);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('al', new ALCreateHandlerFunctionDefinitionProvider())
	);
	context.subscriptions.push(
		vscode.languages.registerReferenceProvider('al', new ALCreateTriggerParameterReferenceProvider())
	);
}


export function deactivate() { }