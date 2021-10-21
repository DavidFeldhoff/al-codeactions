import * as assert from 'assert';
import * as path from 'path';
import { CodeAction, Position, Range, TextDocument, window, workspace } from 'vscode';
import { Command } from '../../extension/Entities/Command';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { CodeActionProviderExtractLabel } from '../../extension/Services/CodeActionProviderExtractLabel';
import { Config } from '../../extension/Utils/config';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

// import * as myExtension from '../extension';

suite('Extract to Label with Placeholders Config On Test Suite', function () {
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
		await Config.setExtractToLabelCreatesComment(document.uri, true);

		window.showInformationMessage('Start all tests of CodeActionProviderExtractLabel.');
	});

	test('extractToLabelOnNone', async () => {
		let textToExtract = 'No Local Var Section end.';
		let expectedResult: { newText: string, snippetMode: boolean } = {
			newText: '    var\r\n        newLabel: Label \'No Local Var Section end.\';\r\n',
			snippetMode: false
		};
		let rangeOfTextLiteral = getRangeOfTextLiteral(document, textToExtract);
		let positionToExecute: Position = rangeOfTextLiteral.start.translate(0, 0);
		let codeActions: CodeAction[] = await new CodeActionProviderExtractLabel(document, new Range(positionToExecute, positionToExecute)).createCodeActions();

		verifyCodeActionProviderExtractLabel(expectedResult, codeActions);
	});

	test('extractToLabelOnOne', async () => {
		let textToExtract = 'No Local Var Section %1 %3 %2 end.';
		let expectedResult: { newText: string, snippetMode: boolean } = {
			newText: "    var\r\n        ${0:newLabel}: Label 'No Local Var Section %1 %3 %2 end.', Comment='%1=${1}; %2=${2}; %3=${3}';\r\n",
			snippetMode: true
		}
		let rangeOfTextLiteral = getRangeOfTextLiteral(document, textToExtract);
		let positionToExecute: Position = rangeOfTextLiteral.start.translate(0, 0);
		let codeActions: CodeAction[] = await new CodeActionProviderExtractLabel(document, new Range(positionToExecute, positionToExecute)).createCodeActions();

		verifyCodeActionProviderExtractLabel(expectedResult, codeActions);
	});

	function verifyCodeActionProviderExtractLabel(expectedResult: { newText: string, snippetMode: boolean }, codeActions: CodeAction[]) {
		assert.strictEqual(codeActions.length, 1, 'Expected one codeAction');
		assert.notStrictEqual(codeActions[0].command, undefined, 'command expected');
		let command = codeActions[0].command!;
		assert.strictEqual(command.command, Command.extractLabel, 'ExtractLabel Command expected');
		assert.notStrictEqual(command.arguments, undefined)
		let { snippetMode, edit, snippetParams } = new CodeActionProviderExtractLabel(command.arguments![0], command.arguments![1]).getWorkspaceEditAndSnippetString(command.arguments![2], command.arguments![3]);
		assert.strictEqual(snippetMode, expectedResult.snippetMode, 'SnippetMode');
		if (expectedResult.snippetMode)
			assert.strictEqual(snippetParams!.snippetString.value, expectedResult.newText);
		else
			assert.strictEqual(edit.entries().pop()![1].pop()!.newText, expectedResult.newText);
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