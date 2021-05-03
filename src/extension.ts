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
import { CodeActionKind, commands, Diagnostic, ExtensionContext, languages, Location, TextDocument, window } from 'vscode';

export function activate(context: ExtensionContext) {
	OwnConsole.ownConsole = window.createOutputChannel("AL CodeActions");

	console.log('Congratulations, your extension "al-codeactions" is now active!');

	context.subscriptions.push(
		languages.registerCodeActionsProvider('al', new CodeActionProvider_General(),
			{ providedCodeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorExtract] })
	)

	context.subscriptions.push(
		commands.registerCommand(Command.renameCommand, (location: Location) => DocumentUtils.executeRename(location))
	);
	context.subscriptions.push(commands.registerCommand('alCodeActions.findRelatedCalls', () => FindRelated.exec(1)))
	context.subscriptions.push(commands.registerCommand('alCodeActions.findRelatedEventSubscriber', () => FindRelated.exec(2)))
	context.subscriptions.push(commands.registerCommand('alCodeActions.findRelatedTriggers', () => FindRelated.exec(3)))
	context.subscriptions.push(languages.registerReferenceProvider('al', new FindRelatedCalls))
	context.subscriptions.push(languages.registerReferenceProvider('al', new FindRelatedEventSubscribers()))
	context.subscriptions.push(languages.registerReferenceProvider('al', new FindRelatedTriggersOfTableExt()))
		

	context.subscriptions.push(
		commands.registerCommand(CreateProcedureCommands.createProcedureCommand,
			(document: TextDocument, procedure: ALProcedure) =>
				CreateProcedureCommands.addProcedureToSourceCode(document, procedure))
	);
	context.subscriptions.push(
		commands.registerCommand(CreateProcedureCommands.createHandlerCommand,
			(document: TextDocument, diagnostic: Diagnostic) =>
				CreateProcedureCommands.addHandler(document, diagnostic))
	);
	context.subscriptions.push(
		commands.registerCommand('alCodeActions.fixCop', () => new FixCop().resolve())
	)

	context.subscriptions.push(
		languages.registerReferenceProvider('al', new ReferenceProviderHandlerFunctions())
	);
	context.subscriptions.push(
		languages.registerDefinitionProvider('al', new DefinitionProviderHandlerFunctions())
	);
	context.subscriptions.push(
		languages.registerDefinitionProvider('al', new DefinitionProviderCallToTrigger())
	);
	context.subscriptions.push(
		languages.registerReferenceProvider('al', new ReferenceProviderTriggerParameter())
	);
	if (!ALStudioExtension.isAvailable()) {
		context.subscriptions.push(
			languages.registerDefinitionProvider('al', new DefinitionProviderIntegrationEvent())
		);
	}
	context.subscriptions.push(
		languages.registerCompletionItemProvider('al', new CompletionItemProviderVariable())
	)
	context.subscriptions.push(window.onDidChangeTextEditorSelection(ContextSetter.onDidChangeTextEditorSelection))
}


export function deactivate() { }