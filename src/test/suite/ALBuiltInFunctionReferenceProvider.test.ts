import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { ReferenceProviderBuiltInFunctions } from '../../extension/Services/ReferenceProviderBuiltInFunctions';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

suite('ALBuiltInFunctionReferenceProvider Test Suite', function () {
	let codeunitDocument: vscode.TextDocument;
	let tableTriggersTableDoc: vscode.TextDocument;
	let myPageDocument: vscode.TextDocument;

	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();

		let fileName = path.resolve(ALTestProject.dir, 'TableTriggerReferences', 'TableTriggers.Table.al');
		await vscode.workspace.openTextDocument(fileName).then(doc => {
			tableTriggersTableDoc = doc;
		});

		vscode.window.showInformationMessage('Start all tests of ALBuiltInFunctionDefinitionProvider.');
	});

	test('GetCalledInserts_MyTable', async () => {
		let textToSkip: string = 'trigger ';
		let lineTextToSearch = 'trigger OnInsert()';
		let rangeOfLine = getRangeOfLine(tableTriggersTableDoc, lineTextToSearch);
		let positionToExecuteRefProvider: vscode.Position = rangeOfLine.start.translate(0, textToSkip.length);
		let cancellationToken: any;
		let locations: vscode.Location[] = await new ReferenceProviderBuiltInFunctions().provideReferences(tableTriggersTableDoc, positionToExecuteRefProvider, { includeDeclaration: true }, cancellationToken)
		assert.strictEqual(locations.length, 12, 'References expected');
		assert.strictEqual(locations.filter(location => location.uri.fsPath.includes('\\TableTriggers.Table.al')).length, 4, 'TableTriggers.Table.al')
		assert.strictEqual(locations.filter(location => location.uri.fsPath.includes('\\TableTriggers.Report.al')).length, 1, 'TableTriggers.Report.al')
		assert.strictEqual(locations.filter(location => location.uri.fsPath.includes('\\TableTriggers.Page.al')).length, 2, 'TableTriggers.Page.al')
		assert.strictEqual(locations.filter(location => location.uri.fsPath.includes('\\CodeunitWithDifferentTableNo.Codeunit.al')).length, 3, 'CodeunitWithDifferentTableNo.Codeunit.al')
		assert.strictEqual(locations.filter(location => location.uri.fsPath.includes('\\CodeunitWithTableNo.Codeunit.al')).length, 2, 'CodeunitWithTableNo.Codeunit.al')
	});



	function getRangeOfLine(document: vscode.TextDocument, lineTextToSearch: string, startingAtLine: number = 0): vscode.Range {
		let line: number | undefined;
		for (let i = startingAtLine; i < document.lineCount; i++) {
			if (document.lineAt(i).text.trim() == lineTextToSearch) {
				line = i;
				break;
			}
		}
		assert.notStrictEqual(line, undefined, 'line should be found.');
		line = line as number;
		let lineText = document.lineAt(line).text;
		let startPos = lineText.indexOf(lineTextToSearch);
		let endPos = startPos + lineTextToSearch.length;
		return new vscode.Range(line, startPos, line, endPos);
	}
});