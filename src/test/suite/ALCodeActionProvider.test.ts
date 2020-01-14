import * as assert from 'assert';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ALCodeActionProvider } from '../../extension/alCodeActionProvider';
import { ALProcedure } from '../../extension/alProcedure';
import { ALTestProject } from './ALTestProject';
import { ALLanguageExtension } from '../../extension/alExtension';
// import * as myExtension from '../extension';

suite('ALCodeActionProvider Test Suite', function () {
	let codeunit1Document: vscode.TextDocument;
	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();

		//open the file just once
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(document => {
			codeunit1Document = document;
		});
		vscode.window.showInformationMessage('Start all tests of ALCodeActionProvider.');
	});

	test('getProcedureToCreate_NoParameter', async () => {
		let procedureName = 'MissingProcedureWithoutParameters';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.equal(alProcedure.name, procedureName);
		assert.equal(alProcedure.returnType, undefined);
		assert.equal(alProcedure.parameters.length, 0);
	}).timeout(3000); //First time opening something can take a little bit longer
	test('getProcedureToCreate_OneParameter', async () => {
		let procedureName = 'MissingProcedureWithParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.equal(alProcedure.name, procedureName);
		assert.equal(alProcedure.returnType, undefined);
		assert.equal(alProcedure.parameters.length, 1);
	});
	test('getProcedureToCreate_TwoParameters', async () => {
		let procedureName = 'MissingProcedureWithParameters';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.equal(alProcedure.name, procedureName);
		assert.equal(alProcedure.returnType, undefined);
		assert.equal(alProcedure.parameters.length, 2);
		assert.equal(alProcedure.parameters[0].name, 'myInteger');
		assert.equal(alProcedure.parameters[0].getTypeDefinition(), 'Integer');
		assert.equal(alProcedure.parameters[1].name, 'myBoolean');
		assert.equal(alProcedure.parameters[1].getTypeDefinition(), 'Boolean');
	});
	test('getProcedureToCreate_ReturnValue', async () => {
		let procedureName = 'MissingProcedureWithReturn';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.equal(alProcedure.name, procedureName);
		assert.notEqual(alProcedure.returnType, undefined);
		assert.equal(alProcedure.getReturnTypeAsString(), 'Text[20]');
		assert.equal(alProcedure.parameters.length, 1);
		assert.equal(alProcedure.parameters[0].name, 'myInteger');
		assert.equal(alProcedure.parameters[0].getTypeDefinition(), 'Integer');
	});
	test('getProcedureToCreate_OfOtherObject', async () => {
		let procedureName = 'MissingProcedureOfOtherObject';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.equal(alProcedure.name, procedureName);
		assert.equal(alProcedure.returnType, undefined);
		assert.equal(alProcedure.parameters.length, 2);
		assert.equal(alProcedure.parameters[0].name, 'myInteger');
		assert.equal(alProcedure.parameters[0].getTypeDefinition(), 'Integer');
		assert.equal(alProcedure.parameters[1].name, 'myBoolean');
		assert.equal(alProcedure.parameters[1].getTypeDefinition(), 'Boolean');
		assert.equal(alProcedure.ObjectOfProcedure.name, "SecondCodeunit");
	});
	test('getProcedureToCreate_OfOtherObjectWithReturn', async () => {
		let procedureName = 'MissingProcedureOfOtherObjectWithReturn';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.equal(alProcedure.name, procedureName);
		assert.notEqual(alProcedure.returnType, undefined);
		assert.equal(alProcedure.getReturnTypeAsString(), "Text[20]");
		assert.equal(alProcedure.parameters.length, 2);
		assert.equal(alProcedure.parameters[0].name, 'myInteger');
		assert.equal(alProcedure.parameters[0].getTypeDefinition(), 'Integer');
		assert.equal(alProcedure.parameters[1].name, 'myBoolean');
		assert.equal(alProcedure.parameters[1].getTypeDefinition(), 'Boolean');
		assert.equal(alProcedure.ObjectOfProcedure.name, "SecondCodeunit");
	});
	test('getProcedureToCreate_ProcedureAsParameter', async () => {
		let procedureName = 'MissingProcedureWithProcedureCallInside';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.equal(alProcedure.name, procedureName);
		assert.equal(alProcedure.returnType, undefined);
		assert.equal(alProcedure.parameters.length, 1);
		assert.equal(alProcedure.parameters[0].name, 'a');
		//TODO: Not supported yet
		assert.equal(alProcedure.parameters[0].getTypeDefinition(), 'Variant');
		// assert.equal(alProcedure.parameters[0].getTypeDefinition(),'Integer');
	});
	test('getProcedureToCreate_ReturnValueDirectlyUsed', async () => {
		let procedureName = 'MissingProcedureWithDirectlyUsedReturnValue';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
		//TODO: Not supported yet
		assert.equal(alProcedure, undefined);
		// assert.notEqual(alProcedure, undefined, 'Procedure should be created');
		// alProcedure = alProcedure as ALProcedure;
		// assert.equal(alProcedure.name, procedureName);
		//assert.notEqual(alProcedure.returnType, undefined);
		// assert.equal(alProcedure.getReturnTypeAsString(), "Integer");
		// assert.equal(alProcedure.parameters.length, 0);
	});

	//Currently these tests can't run on a pipeline because the executeDefinitionProvider fails in finding the symbols.
	// test('getProcedureToCreate_FieldAsParameter', async function () {
	// 	let procedureName = 'MissingProcedureWithFieldsAsParameter';
	// 	let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
	// 	let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
	// 	assert.notEqual(alProcedure, undefined, 'Procedure should be created');
	// 	alProcedure = alProcedure as ALProcedure;
	// 	assert.equal(alProcedure.name, procedureName);
	// 	assert.equal(alProcedure.returnType, undefined);
	// 	assert.equal(alProcedure.parameters.length, 1);
	// 	assert.equal(alProcedure.parameters[0].name, '"No."');
	// 	assert.equal(alProcedure.parameters[0].getTypeDefinition(), "Code[20]");
	// }); //first time interacting with the symbols and another extensin can take some time.
	// test('getProcedureToCreate_TwoFieldsWithSameNameAsParameter', async function () {
	// 	let procedureName = 'MissingProcedureWithTwoFieldsWithSameNameAsParameter';
	// 	let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
	// 	let alProcedure = await new ALCodeActionProvider().getProcedureToCreate(codeunit1Document, rangeOfProcedureName);
	// 	assert.notEqual(alProcedure, undefined, 'Procedure should be created');
	// 	alProcedure = alProcedure as ALProcedure;
	// 	assert.equal(alProcedure.name, procedureName);
	// 	assert.equal(alProcedure.returnType, undefined);
	// 	assert.equal(alProcedure.parameters.length, 2);
	// 	assert.equal(alProcedure.parameters[0].name, '"No."');
	// 	assert.equal(alProcedure.parameters[0].getTypeDefinition(), "Code[20]");
	// 	assert.equal(alProcedure.parameters[1].name, '"No."');
	// 	assert.equal(alProcedure.parameters[1].getTypeDefinition(), "Code[20]");
	// });

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