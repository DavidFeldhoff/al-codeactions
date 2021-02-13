import * as vscode from 'vscode';
import { ALStudioExtension } from './extension/ALStudio/ALStudioExtension';
import { OwnConsole } from './extension/console';
import { CreateProcedureCommands } from './extension/Create Procedure/CreateProcedureCommands';
import { ALProcedure } from './extension/Entities/alProcedure';
import { Command } from './extension/Entities/Command';
import { CodeActionProvider_General } from './extension/Services/CodeActionProvider_General';
import { FixCop } from './extension/Services/CommandFixCop';
import { DefinitionProviderHandlerFunctions } from './extension/Services/DefinitionProviderHandlerFunctions';
import { DefinitionProviderIntegrationEvent } from './extension/Services/DefinitionProviderIntegrationEvent';
import { DefinitionProviderOnInsert } from './extension/Services/DefinitionProviderOnInsert';
import { ReferenceProviderHandlerFunctions } from './extension/Services/ReferenceProviderHandlerFunctions';
import { ReferenceProviderTriggerParameter } from './extension/Services/ReferenceProviderTriggerParameter';
import { DocumentUtils } from './extension/Utils/documentUtils';

export function activate(context: vscode.ExtensionContext) {
	OwnConsole.ownConsole = vscode.window.createOutputChannel("AL CodeActions");

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('al', new CodeActionProvider_General(),
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
		vscode.commands.registerCommand('alcodeactions.fixCop', () => new FixCop().resolve())
	)

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
	if (!ALStudioExtension.isAvailable()) {
		context.subscriptions.push(
			vscode.languages.registerDefinitionProvider('al', new DefinitionProviderIntegrationEvent())
		);
	}
	// context.subscriptions.push(
	// 	vscode.languages.registerReferenceProvider('al', new ReferenceProviderBuiltInFunctions())
	// )
}


export function deactivate() { }