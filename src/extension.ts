import * as vscode from 'vscode';
import { ALCreateHandlerFunctionDefinitionProvider } from './extension/Services/alCreateHandlerFunctionDefinitionProvider';
import { ALCreateHandlerFunctionReferenceProvider } from './extension/Services/alCreateHandlerFunctionReferenceProvider';
import { ALCreateProcedureCA } from './extension/Services/alCreateProcedureCA';
import { ALCreateTriggerParameterReferenceProvider } from './extension/Services/alCreateTriggerParameterReferenceProvider';
import { ALExtractToProcedureCA } from './extension/Services/alExtractToProcedureCA';
import { OwnConsole } from './extension/console';
import { CreateProcedureCommands } from './extension/Create Procedure/CreateProcedureCommands';
import { ALProcedure } from './extension/Entities/alProcedure';
import { ALDiagnostics } from './extension/Services/alDiagnostics';
import { RefactorPageRun } from './extension/Services/refactorPageRun';

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
		vscode.languages.registerCodeActionsProvider('al', new RefactorPageRun(), {
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
	//active document changed - get Diagnostics of current file
	let diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('dfe');
	vscode.workspace.onDidChangeTextDocument(textDocChangeEvent => {
		let diagnostics: vscode.Diagnostic[] = ALDiagnostics.getDiagnosticsOfFile(textDocChangeEvent.document);
		diagnosticCollection.set(textDocChangeEvent.document.uri, diagnostics);
	});
}


export function deactivate() { }