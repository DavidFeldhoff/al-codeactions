import * as assert from 'assert';
import * as path from 'path';
import { CodeAction, Position, Range, TextDocument, TextEdit, window, workspace, WorkspaceEdit } from 'vscode';
import { Command } from '../../extension/Entities/Command';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { CodeActionProviderExtractLabel } from '../../extension/Services/CodeActionProviderExtractLabel';
import { Config } from '../../extension/Utils/config';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

// import * as myExtension from '../extension';

suite('Extract to Label with Placeholders Config Off Test Suite', function () {
	let document: TextDocument;
	let rootPath: string;

	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();
		if (workspace.workspaceFolders)
			rootPath = workspace.workspaceFolders[0].uri.fsPath;

		//open the file just once
		let fileName = path.resolve(ALTestProject.dir, 'extractLabelWithPlaceholders.codeunit.al');
		document = await workspace.openTextDocument(fileName);
		await Config.setExtractToLabelCreatesComment(document.uri, false);

		window.showInformationMessage('Start all tests of CodeActionProviderExtractLabel.');
	});

	test('extractToLabelOffNone', async () => {
		let textToExtract = 'No Local Var Section end.';
		let expectedResults: { newText: string, snippetMode: boolean }[] = [
			{
				newText: '    var\r\n        newLabel: Label \'No Local Var Section end.\';\r\n',
				snippetMode: false
			},
			{
				newText: '    var\r\n        newLabel: Label \'No Local Var Section end.\', Locked = true;\r\n',
				snippetMode: false
			}
		];
		let rangeOfTextLiteral = getRangeOfTextLiteral(document, textToExtract);
		let positionToExecute: Position = rangeOfTextLiteral.start.translate(0, 0);
		let codeActionProvider = new CodeActionProviderExtractLabel(document, new Range(positionToExecute, positionToExecute));
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();

		await verifyCodeActionProviderExtractLabel(expectedResults, codeActions);
	});

	test('extractToLabelOffOne', async () => {
		let textToExtract = 'No Local Var Section %1 %3 %2 end.';
		let expectedResults: { newText: string, snippetMode: boolean }[] = [
			{
				newText: '    var\r\n        newLabel: Label \'No Local Var Section %1 %3 %2 end.\';\r\n',
				snippetMode: false
			},
			{
				newText: '    var\r\n        newLabel: Label \'No Local Var Section %1 %3 %2 end.\', Locked = true;\r\n',
				snippetMode: false
			}
		];
		let rangeOfTextLiteral = getRangeOfTextLiteral(document, textToExtract);
		let positionToExecute: Position = rangeOfTextLiteral.start.translate(0, 0);
		let codeActionProvider = new CodeActionProviderExtractLabel(document, new Range(positionToExecute, positionToExecute));
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();

		await verifyCodeActionProviderExtractLabel(expectedResults, codeActions);
	});

	async function verifyCodeActionProviderExtractLabel(expectedResults: { newText: string, snippetMode: boolean }[], codeActions: CodeAction[]) {
		assert.strictEqual(codeActions.length, expectedResults.length, 'Expected codeActions');
		
		for (let i = 0; i < expectedResults.length; i++) {
			const expectedResult = expectedResults[i]
			assert.notStrictEqual(codeActions[i].command, undefined, 'command expected');
			const commandExtractToLabel = codeActions[i].command!;
			assert.strictEqual(commandExtractToLabel.command, Command.extractLabel, 'ExtractLabel Command expected');
			assert.notStrictEqual(commandExtractToLabel.arguments, undefined)
			const result = await new CodeActionProviderExtractLabel(commandExtractToLabel.arguments![0], commandExtractToLabel.arguments![1]).getWorkspaceEditAndSnippetString(commandExtractToLabel.arguments![2], commandExtractToLabel.arguments![3], commandExtractToLabel.arguments![4]);
			assert.strictEqual(result!.snippetMode, expectedResult.snippetMode, 'SnippetMode');
			if (expectedResult.snippetMode)
				assert.strictEqual(result!.snippetParams!.snippetString, expectedResult.newText);
			else
				assert.strictEqual(result!.edit.entries().pop()![1].pop()!.newText, expectedResult.newText);
		}
	}

	function getRangeOfTextLiteral(document: TextDocument, textLiteral: string): Range {
		let line: number | undefined;
		for (let i = 0; i < document.lineCount; i++) {
			if (document.lineAt(i).text.includes(textLiteral)) {
				line = i;
				break;
			}
		}
		assert.notStrictEqual(line, undefined, 'line should be found.');
		line = line as number;
		let lineText = document.lineAt(line).text;
		let startPos = lineText.indexOf(textLiteral);
		let endPos = startPos + textLiteral.length;
		return new Range(line, startPos, line, endPos);
	}
});