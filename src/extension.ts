import * as vscode from 'vscode';
import { OwnConsole } from './extension/console';
import { CreateProcedureCommands } from './extension/Create Procedure/CreateProcedureCommands';
import { ALProcedure } from './extension/Entities/alProcedure';
import { Command } from './extension/Entities/Command';
import { ALCodeActionProvider } from './extension/Services/alCodeActionProvider';
import { ALCreateDefinitionProviderOnInsert } from './extension/Services/alCreateDefinitionProviderOnInsert';
import { ALCreateFixWithUsageCommand } from './extension/Services/alCreateFixWithUsageCommand';
import { ALCreateHandlerFunctionDefinitionProvider } from './extension/Services/alCreateHandlerFunctionDefinitionProvider';
import { ALCreateHandlerFunctionReferenceProvider } from './extension/Services/alCreateHandlerFunctionReferenceProvider';
import { ALCreateTriggerParameterReferenceProvider } from './extension/Services/alCreateTriggerParameterReferenceProvider';
import { DocumentUtils } from './extension/Utils/documentUtils';

export function activate(context: vscode.ExtensionContext) {
	OwnConsole.ownConsole = vscode.window.createOutputChannel("AL CodeActions");

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new ALCodeActionProvider(),
			{ providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.RefactorExtract] })
	)

	context.subscriptions.push(
		vscode.commands.registerCommand(Command.renameCommand, (location: vscode.Location) => DocumentUtils.executeRename(location))
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
		vscode.languages.registerDefinitionProvider('al', new ALCreateDefinitionProviderOnInsert())
	);
	context.subscriptions.push(
		vscode.languages.registerReferenceProvider('al', new ALCreateTriggerParameterReferenceProvider())
	);


	context.subscriptions.push(
		vscode.commands.registerCommand('alcodeactions.fiximplicitwithusages', () => ALCreateFixWithUsageCommand.fixImplicitWithUsages())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('alcodeactions.addpragmaimplicitwithdisable', () => ALCreateFixWithUsageCommand.addPragmaImplicitWithDisable())
	);
}


export function deactivate() { }