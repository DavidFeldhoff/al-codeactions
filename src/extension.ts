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
import { CodeActionKind, commands, Diagnostic, ExtensionContext, languages, Location, Range, TextDocument, window, WorkspaceEdit } from 'vscode';
import { ExtractProcedureCommand } from './extension/Extract Procedure/ExtractProcedureCommand';
import { ALFullSyntaxTreeNode } from './extension/AL Code Outline/alFullSyntaxTreeNode';
import { ALVariable } from './extension/Entities/alVariable';
import { CommandModifyProcedure } from './extension/Services/CommandModifyProcedure';
import { CodeActionProviderModifyProcedureContent, PublisherToAdd } from './extension/Services/CodeActionProviderModifyProcedureContent';

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
	context.subscriptions.push(commands.registerCommand(Command.extractProcedure,
		(currentDocument: TextDocument, procedureCallingText: string, procedureToCreate: ALProcedure, rangeExpanded: Range) =>
			ExtractProcedureCommand.extract(currentDocument, procedureCallingText, procedureToCreate, rangeExpanded))
	)
	context.subscriptions.push(commands.registerCommand(Command.findRelatedCalls, () => FindRelated.exec(1)))
	context.subscriptions.push(commands.registerCommand(Command.findRelatedEventSubscriber, () => FindRelated.exec(2)))
	context.subscriptions.push(commands.registerCommand(Command.findRelatedTriggers, () => FindRelated.exec(3)))
	context.subscriptions.push(languages.registerReferenceProvider('al', new FindRelatedCalls))
	context.subscriptions.push(languages.registerReferenceProvider('al', new FindRelatedEventSubscribers()))
	context.subscriptions.push(languages.registerReferenceProvider('al', new FindRelatedTriggersOfTableExt()))


	context.subscriptions.push(
		commands.registerCommand(Command.createProcedureCommand,
			(document: TextDocument, procedure: ALProcedure) =>
				CreateProcedureCommands.addProcedureToSourceCode(document, procedure))
	);
	context.subscriptions.push(
		commands.registerCommand(Command.createHandlerCommand,
			(document: TextDocument, diagnostic: Diagnostic) =>
				CreateProcedureCommands.addHandler(document, diagnostic))
	);
	context.subscriptions.push(commands.registerCommand(Command.fixCop, () => new FixCop().resolve()))
	context.subscriptions.push(commands.registerCommand(Command.addParametersToProcedure,
		(doc: TextDocument, methodNode: ALFullSyntaxTreeNode, missingParameters: ALVariable[]) => CommandModifyProcedure.addParametersToProcedure(doc, methodNode, missingParameters)))
	context.subscriptions.push(commands.registerCommand(Command.createOverloadOfProcedure,
		(doc: TextDocument, methodNode: ALFullSyntaxTreeNode, missingParameters: ALVariable[]) => CommandModifyProcedure.createOverloadOfProcedure(doc, methodNode, missingParameters)))


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
	context.subscriptions.push(commands.registerCommand(Command.showError, (message: string) => window.showInformationMessage(message)))
	context.subscriptions.push(commands.registerCommand(Command.modifyProcedureContent, (document: TextDocument, range: Range, publisherToAdd: PublisherToAdd) => 
		new CodeActionProviderModifyProcedureContent(document, range).executeCommand(publisherToAdd)))
}


export function deactivate() { }