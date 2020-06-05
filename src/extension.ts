import { ALCreateFixWithUsageCommand } from './extension/Services/alCreateFixWithUsageCommand';
import * as vscode from 'vscode';
import { OwnConsole } from './extension/console';
import { CreateProcedureCommands } from './extension/Create Procedure/CreateProcedureCommands';
import { ALProcedure } from './extension/Entities/alProcedure';
import { ALCreateHandlerFunctionDefinitionProvider } from './extension/Services/alCreateHandlerFunctionDefinitionProvider';
import { ALCreateHandlerFunctionReferenceProvider } from './extension/Services/alCreateHandlerFunctionReferenceProvider';
import { ALCreateProcedureCodeAction } from './extension/Services/alCreateProcedureCodeAction';
import { ALCreateTriggerParameterReferenceProvider } from './extension/Services/alCreateTriggerParameterReferenceProvider';
import { ALExtractToProcedureCodeAction } from './extension/Services/alExtractToProcedureCodeAction';

export function activate(context: vscode.ExtensionContext) {
	OwnConsole.ownConsole = vscode.window.createOutputChannel("AL CodeActions");

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ALCreateProcedureCodeAction(), {
			providedCodeActionKinds: ALCreateProcedureCodeAction.providedCodeActionKinds
		})
	);
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ALExtractToProcedureCodeAction(), {
			providedCodeActionKinds: ALExtractToProcedureCodeAction.providedCodeActionKinds
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(CreateProcedureCommands.renameMethodCommand, () => ALExtractToProcedureCodeAction.renameMethod())
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


	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('alcodeactions.fixwithusages', () => ALCreateFixWithUsageCommand.fixWithUsages())
	// );
	// vscode.workspace.onDidChangeTextDocument(e => ALCreateFixWithUsageCommand.onAfterCodeActionExecuted(e));
}


export function deactivate() { }