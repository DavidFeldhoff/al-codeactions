import * as assert from 'assert';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ALCodeActionProvider } from '../../extension/alCodeActionProvider';
import { ALProcedure } from '../../extension/alProcedure';
// import * as myExtension from '../extension';

suite('ALCodeActionProvider Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests of ALCodeActionProvider.');

	test('getProcedureToCreate_Easy', async () => {
		let fileName = path.resolve(__dirname, './testFiles/codeunit1.testal');
		await vscode.workspace.openTextDocument(fileName).then(async document => {
			let line: number | undefined;
			let procedureName = 'MissingProcedureWithParameter';
			for (let i = 0; i < document.lineCount; i++) {
				if (document.lineAt(i).text.includes(procedureName + '(')) {
					line = i;
					break;
				}
			}
			assert.notEqual(line, undefined, 'line should be found.');
			line = line as number;
			let lineText = document.lineAt(line).text;
			let startPos = lineText.indexOf(procedureName);
			let endPos = lineText.indexOf('(', startPos);
			let rangeOfProcedureName = new vscode.Range(line, startPos, line, endPos);
			let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(document, rangeOfProcedureName);
			assert.notEqual(alProcedure, undefined, 'Procedure should be created');
			alProcedure = alProcedure as ALProcedure;
			assert.equal(alProcedure.name, procedureName);
			assert.equal(alProcedure.returnType, undefined);
			assert.equal(alProcedure.parameters.length, 1);
		});
	});
});