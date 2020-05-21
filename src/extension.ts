import * as vscode from 'vscode';
import { ALCreateProcedureCA } from './extension/Code Actions/alCreateProcedureCA';
import { ALExtractToProcedureCA } from './extension/Code Actions/alExtractToProcedureCA';
import { OwnConsole } from './extension/console';
import { ALCreateHandlerFunctionReferenceProvider } from './extension/Code Actions/alCreateHandlerFunctionReferenceProvider';
import { ALCreateHandlerFunctionDefinitionProvider } from './extension/Code Actions/alCreateHandlerFunctionDefinitionProvider';
import { ALCreateTriggerParameterReferenceProvider } from './extension/Code Actions/alCreateTriggerParameterReferenceProvider';
import { CreateProcedureCommands } from './extension/Create Procedure/CreateProcedureCommands';
import { CreateProcedure } from './extension/Create Procedure/Procedure Creator/CreateProcedure';
import { ALProcedure } from './extension/Entities/alProcedure';

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
		vscode.commands.registerCommand(CreateProcedureCommands.createProcedureCommand,
			(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, procedure: ALProcedure) =>
				CreateProcedureCommands.addProcedureToSourceCode(document, diagnostic, procedure))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(CreateProcedureCommands.createHandlerCommand,
			(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) =>
				CreateProcedureCommands.addHandler(document, diagnostic))
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