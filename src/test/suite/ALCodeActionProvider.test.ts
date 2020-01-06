import * as assert from 'assert';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ALCodeActionProvider } from '../../extension/alCodeActionProvider';
import { ALProcedure } from '../../extension/alProcedure';
import { ALTestProject } from './ALTestProject';
// import * as myExtension from '../extension';

suite('ALCodeActionProvider Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests of ALCodeActionProvider.');

	test('getProcedureToCreate_NoParameter', async () => {
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(async document => {
			let procedureName = 'MissingProcedureWithoutParameters';
			let rangeOfProcedureName = getRangeOfProcedureName(document, procedureName);
			let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(document, rangeOfProcedureName);
			assert.notEqual(alProcedure, undefined, 'Procedure should be created');
			alProcedure = alProcedure as ALProcedure;
			assert.equal(alProcedure.name, procedureName);
			assert.equal(alProcedure.returnType, undefined);
			assert.equal(alProcedure.parameters.length, 0);
		});
	});
	test('getProcedureToCreate_OneParameter', async () => {
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(async document => {
			let procedureName = 'MissingProcedureWithParameter';
			let rangeOfProcedureName = getRangeOfProcedureName(document, procedureName);
			let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(document, rangeOfProcedureName);
			assert.notEqual(alProcedure, undefined, 'Procedure should be created');
			alProcedure = alProcedure as ALProcedure;
			assert.equal(alProcedure.name, procedureName);
			assert.equal(alProcedure.returnType, undefined);
			assert.equal(alProcedure.parameters.length, 1);
		});
	});
	test('getProcedureToCreate_TwoParameters', async () => {
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(async document => {
			let procedureName = 'MissingProcedureWithParameters';
			let rangeOfProcedureName = getRangeOfProcedureName(document, procedureName);
			let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(document, rangeOfProcedureName);
			assert.notEqual(alProcedure, undefined, 'Procedure should be created');
			alProcedure = alProcedure as ALProcedure;
			assert.equal(alProcedure.name, procedureName);
			assert.equal(alProcedure.returnType, undefined);
			assert.equal(alProcedure.parameters.length, 2);
			assert.equal(alProcedure.parameters[0].name,'myInteger');
			assert.equal(alProcedure.parameters[0].getTypeDefinition(),'Integer');
			assert.equal(alProcedure.parameters[1].name,'myBoolean');
			assert.equal(alProcedure.parameters[1].getTypeDefinition(),'Boolean');
		});
	});
	test('getProcedureToCreate_ReturnValue', async () => {
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(async document => {
			let procedureName = 'MissingProcedureWithReturn';
			let rangeOfProcedureName = getRangeOfProcedureName(document, procedureName);
			let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(document, rangeOfProcedureName);
			assert.notEqual(alProcedure, undefined, 'Procedure should be created');
			alProcedure = alProcedure as ALProcedure;
			assert.equal(alProcedure.name, procedureName);
			assert.notEqual(alProcedure.returnType, undefined);
			assert.equal(alProcedure.getReturnTypeAsString(), 'Text[20]');
			assert.equal(alProcedure.parameters.length, 1);
			assert.equal(alProcedure.parameters[0].name,'myInteger');
			assert.equal(alProcedure.parameters[0].getTypeDefinition(),'Integer');
		});
	});
	test('getProcedureToCreate_OfOtherObject', async () => {
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(async document => {
			let procedureName = 'MissingProcedureOfOtherObject';
			let rangeOfProcedureName = getRangeOfProcedureName(document, procedureName);
			let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(document, rangeOfProcedureName);
			assert.notEqual(alProcedure, undefined, 'Procedure should be created');
			alProcedure = alProcedure as ALProcedure;
			assert.equal(alProcedure.name, procedureName);
			assert.equal(alProcedure.returnType, undefined);
			assert.equal(alProcedure.parameters.length, 2);
			assert.equal(alProcedure.parameters[0].name,'myInteger');
			assert.equal(alProcedure.parameters[0].getTypeDefinition(),'Integer');
			assert.equal(alProcedure.parameters[1].name,'myBoolean');
			assert.equal(alProcedure.parameters[1].getTypeDefinition(),'Boolean');
			assert.equal(alProcedure.ObjectOfProcedure.name,"SecondCodeunit");
		});
	});
	test('getProcedureToCreate_OfOtherObjectWithReturn', async () => {
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(async document => {
			let procedureName = 'MissingProcedureOfOtherObjectWithReturn';
			let rangeOfProcedureName = getRangeOfProcedureName(document, procedureName);
			let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(document, rangeOfProcedureName);
			assert.notEqual(alProcedure, undefined, 'Procedure should be created');
			alProcedure = alProcedure as ALProcedure;
			assert.equal(alProcedure.name, procedureName);
			assert.notEqual(alProcedure.returnType, undefined);
			assert.equal(alProcedure.getReturnTypeAsString(),"Text[20]");
			assert.equal(alProcedure.parameters.length, 2);
			assert.equal(alProcedure.parameters[0].name,'myInteger');
			assert.equal(alProcedure.parameters[0].getTypeDefinition(),'Integer');
			assert.equal(alProcedure.parameters[1].name,'myBoolean');
			assert.equal(alProcedure.parameters[1].getTypeDefinition(),'Boolean');
			assert.equal(alProcedure.ObjectOfProcedure.name,"SecondCodeunit");
		});
	});

	function getRangeOfProcedureName(document: vscode.TextDocument, procedureName: string): vscode.Range {
		let line: number | undefined;
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
		return new vscode.Range(line, startPos, line, endPos);
	}
});