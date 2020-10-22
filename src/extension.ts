import * as vscode from 'vscode';
import { OwnConsole } from './extension/console';
import { CreateProcedureCommands } from './extension/Create Procedure/CreateProcedureCommands';
import { ALProcedure } from './extension/Entities/alProcedure';
import { Command } from './extension/Entities/Command';
import { ALCodeActionProvider } from './extension/Services/alCodeActionProvider';
import { DefinitionProviderOnInsert } from './extension/Services/DefinitionProviderOnInsert';
import { ALCreateFixWithUsageCommand } from './extension/Services/alCreateFixWithUsageCommand';
import { DefinitionProviderHandlerFunctions } from './extension/Services/DefinitionProviderHandlerFunctions';
import { ReferenceProviderHandlerFunctions } from './extension/Services/ReferenceProviderHandlerFunctions';
import { ReferenceProviderTriggerParameter } from './extension/Services/ReferenceProviderTriggerParameter';
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
		vscode.languages.registerReferenceProvider('al', new ReferenceProviderHandlerFunctions())
	);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('al', new DefinitionProviderHandlerFunctions())
	);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('al', new DefinitionProviderOnInsert())
	);
	context.subscriptions.push(
		vscode.languages.registerReferenceProvider('al', new ReferenceProviderTriggerParameter())
	);


	context.subscriptions.push(
		vscode.commands.registerCommand('alcodeactions.fiximplicitwithusages', () => ALCreateFixWithUsageCommand.fixImplicitWithUsages())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('alcodeactions.addpragmaimplicitwithdisable', () => ALCreateFixWithUsageCommand.addPragmaImplicitWithDisable())
	);
}


export function deactivate() { }