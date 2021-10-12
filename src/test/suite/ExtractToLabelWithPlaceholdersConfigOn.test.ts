import * as assert from 'assert';
import * as path from 'path';
import { TextDocument, workspace, window, Position, CodeAction, Range, WorkspaceEdit, commands, TextEdit, Uri } from 'vscode';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { CodeActionProviderExtractLabel } from '../../extension/Services/CodeActionProviderExtractLabel';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';
import { Config } from '../../extension/Utils/config';
import { config } from 'process';

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
		Config.setExtractToLabelCreatesComment(document.uri, true);
		let configSetting = Config.getExtractToLabelCreatesComment(document.uri);
	
		window.showInformationMessage('Start all tests of CodeActionProviderExtractLabel.');
	});

	test('extractToLabelOnNone', async () => {
		let textToExtract = 'No Local Var Section end.';
		let expectedResult = '    var\r\n        newLabel: Label \'No Local Var Section end.\';\r\n';
		let rangeOfTextLiteral = getRangeOfTextLiteral(document, textToExtract);
		let positionToExecute: Position = rangeOfTextLiteral.start.translate(0, 0);
		let codeActions: CodeAction[] = await new CodeActionProviderExtractLabel(document, new Range(positionToExecute, positionToExecute)).createCodeActions();
		
		verifyCodeActionProviderExtractLabel(expectedResult, codeActions);
	});

	test('extractToLabelOnOne', async () => {
		let textToExtract = 'No Local Var Section %1 end.';
		let expectedResult = '    var\r\n        newLabel: Label \'No Local Var Section %1 end.\', Comment=\'%1=\';\r\n';
		let rangeOfTextLiteral = getRangeOfTextLiteral(document, textToExtract);
		let positionToExecute: Position = rangeOfTextLiteral.start.translate(0, 0);
		let codeActions: CodeAction[] = await new CodeActionProviderExtractLabel(document, new Range(positionToExecute, positionToExecute)).createCodeActions();
		
		verifyCodeActionProviderExtractLabel(expectedResult, codeActions);
	});

	function verifyCodeActionProviderExtractLabel(expectedResult: string, codeActions: CodeAction[]) {
		assert.strictEqual(codeActions.length, 1, 'Expected one codeAction');
		assert.notStrictEqual(codeActions[0].edit, undefined, 'workspaceedit expected')
		let edit = codeActions[0].edit as WorkspaceEdit;
		let editEntries = edit.entries()[0];
        let textEdits: TextEdit[] = editEntries[1];
		
		let labelDeclarationText = textEdits[1].newText;
		assert.strictEqual(labelDeclarationText, expectedResult, 'wrong result')
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