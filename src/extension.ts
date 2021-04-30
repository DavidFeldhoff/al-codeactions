import * as vscode from 'vscode';
import './extension/Utils/StringPrototype'
import { ALStudioExtension } from './extension/ALStudio/ALStudioExtension';
import { OwnConsole } from './extension/console';
import { CreateProcedureCommands } from './extension/Create Procedure/CreateProcedureCommands';
import { ALProcedure } from './extension/Entities/alProcedure';
import { Command } from './extension/Entities/Command';
import { CodeActionProvider_General } from './extension/Services/CodeActionProvider_General';
import { FixCop } from './extension/Services/CommandFixCop';
import { CompletionItemProviderVariable } from './extension/Services/CompletionItemProviderVariable';
import { DefinitionProviderHandlerFunctions } from './extension/Services/DefinitionProviderHandlerFunctions';
import { DefinitionProviderIntegrationEvent } from './extension/Services/DefinitionProviderIntegrationEvent';
import { DefinitionProviderCallToTrigger } from './extension/Services/DefinitionProviderOnInsert';
import { FindRelated } from './extension/Services/FindRelated';
import { FindRelatedEventSubscribers } from './extension/Services/FindRelatedEventSubscribers';
import { ReferenceProviderHandlerFunctions } from './extension/Services/ReferenceProviderHandlerFunctions';
import { ReferenceProviderTriggerParameter } from './extension/Services/ReferenceProviderTriggerParameter';
import { DocumentUtils } from './extension/Utils/documentUtils';
import { FindRelatedCalls } from './extension/Services/FindRelatedCalls';
import { FindRelatedTriggersOfTableExt } from './extension/Services/FindRelatedTriggersOfTableExt';
import { ContextSetter } from './extension/Services/ContextSetter';

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
	context.subscriptions.push(vscode.commands.registerCommand('alCodeActions.findRelatedCalls', () => FindRelated.exec(1)))
	context.subscriptions.push(vscode.commands.registerCommand('alCodeActions.findRelatedEventSubscriber', () => FindRelated.exec(2)))
	context.subscriptions.push(vscode.commands.registerCommand('alCodeActions.findRelatedTriggers', () => FindRelated.exec(3)))
	context.subscriptions.push(vscode.languages.registerReferenceProvider('al', new FindRelatedCalls))
	context.subscriptions.push(vscode.languages.registerReferenceProvider('al', new FindRelatedEventSubscribers()))
	context.subscriptions.push(vscode.languages.registerReferenceProvider('al', new FindRelatedTriggersOfTableExt()))
		

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
		vscode.commands.registerCommand('alCodeActions.fixCop', () => new FixCop().resolve())
	)

	context.subscriptions.push(
		vscode.languages.registerReferenceProvider('al', new ReferenceProviderHandlerFunctions())
	);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('al', new DefinitionProviderHandlerFunctions())
	);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('al', new DefinitionProviderCallToTrigger())
	);
	context.subscriptions.push(
		vscode.languages.registerReferenceProvider('al', new ReferenceProviderTriggerParameter())
	);
	if (!ALStudioExtension.isAvailable()) {
		context.subscriptions.push(
			vscode.languages.registerDefinitionProvider('al', new DefinitionProviderIntegrationEvent())
		);
	}
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('al', new CompletionItemProviderVariable())
	)
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(ContextSetter.onDidChangeTextEditorSelection))
}


export function deactivate() { }