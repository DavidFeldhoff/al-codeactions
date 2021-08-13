import * as assert from 'assert';
import * as path from 'path';
import { TextDocument, workspace, window, Diagnostic, Range, CodeAction, Uri } from 'vscode';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { CreateProcedure } from '../../extension/Create Procedure/Procedure Creator/CreateProcedure';
import { CreateProcedureAL0118 } from '../../extension/Create Procedure/Procedure Creator/CreateProcedureAL0118';
import { CreateProcedureAL0132 } from '../../extension/Create Procedure/Procedure Creator/CreateProcedureAL0132';
import { SupportedDiagnosticCodes } from '../../extension/Create Procedure/supportedDiagnosticCodes';
import { AccessModifier } from '../../extension/Entities/accessModifier';
import { ALProcedure } from '../../extension/Entities/alProcedure';
import { Command } from '../../extension/Entities/Command';
import { CodeActionProviderAL0118 } from '../../extension/Services/CodeActionProviderAL0118';
import { CodeActionProviderAL0132 } from '../../extension/Services/CodeActionProviderAL0132';
import { WorkspaceUtils } from '../../extension/Utils/workspaceUtils';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

// import * as myExtension from '../extension';

suite('ALCreateProcedureCA Test Suite', function () {
	let codeunit1Document: TextDocument;
	let testcodeunitDocument: TextDocument;
	let tableDocument: TextDocument;
	let pageDocument: TextDocument;
	let myPage2Document: TextDocument;
	let mainPageDocument: TextDocument;
	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();

		//open the file just once
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await workspace.openTextDocument(fileName).then(document => {
			codeunit1Document = document;
		});
		fileName = path.resolve(ALTestProject.dir, 'testcodeunit.al');
		await workspace.openTextDocument(fileName).then(document => {
			testcodeunitDocument = document;
		});
		fileName = path.resolve(ALTestProject.dir, 'MyTable.al');
		await workspace.openTextDocument(fileName).then(document => {
			tableDocument = document;
		});
		fileName = path.resolve(ALTestProject.dir, 'MyPage.al');
		await workspace.openTextDocument(fileName).then(document => {
			pageDocument = document;
		});
		fileName = path.resolve(ALTestProject.dir, 'MyPage2.al');
		await workspace.openTextDocument(fileName).then(document => {
			myPage2Document = document;
		});
		fileName = path.resolve(ALTestProject.dir, 'MainPage.al');
		await workspace.openTextDocument(fileName).then(document => {
			mainPageDocument = document;
		});

		window.showInformationMessage('Start all tests of ALCodeActionProvider.');
	});

	test('getProcedureToCreate_NoParameter', async () => {
		let procedureName = 'MissingProcedureWithoutParameters';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 0);
	}).timeout(3000); //First time opening something can take a little bit longer
	test('getProcedureToCreate_OneParameter', async () => {
		let procedureName = 'MissingProcedureWithParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
	});
	test('getProcedureToCreate_TwoParameters', async () => {
		let procedureName = 'MissingProcedureWithParameters';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myBoolean');
		assert.strictEqual(alProcedure.parameters[1].type, 'Boolean');
	});
	test('getProcedureToCreate_EnumAsParameter', async () => {
		let procedureName = 'MissingProcedureWithEnum';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'MyEnum');
		assert.strictEqual(alProcedure.parameters[0].type, 'Enum MyEnum');
	});
	test('getProcedureToCreate_EnumAsParameter2', async () => {
		let procedureName = 'MissingProcedureWithEnum2';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'MyEnum');
		assert.strictEqual(alProcedure.parameters[0].type, 'Enum MyEnum');
	});
	test('getProcedureToCreate_ReturnValue1', async () => {
		let procedureName = 'MissingProcedureWithReturn1';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Text[20]');
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});
	test('getProcedureToCreate_ReturnValue2', async () => {
		let procedureName = 'MissingProcedureWithReturn2';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Text[20]');
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'Laenge');
		assert.strictEqual(alProcedure.parameters[1].type, 'Integer');
	});
	test('getProcedureToCreate_ReturnValue3', async () => {
		let procedureName = 'MissingProcedureWithReturn3';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Text[20]');
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});
	test('getProcedureToCreate_ReturnValue4', async () => {
		let procedureName = 'MissingProcedureWithReturn4';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Text[20]');
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});

	test('getProcedureToCreate_ReturnValueField1', async () => {
		let procedureName = 'MissingProcedureWithFieldReturn1';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});
	test('getProcedureToCreate_ReturnValueField2', async () => {
		let procedureName = 'MissingProcedureWithFieldReturn2';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});
	test('getProcedureToCreate_ReturnValueField3', async () => {
		let procedureName = 'MissingProcedureWithFieldReturn3';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});
	test('getProcedureToCreate_InsideValidate', async () => {
		let procedureName = 'MissingProcedureInsideValidate';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_DotInVariableName', async () => {
		let procedureName = 'MissingProcedureWithDotInVariableName';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'PassNos');
		assert.strictEqual(alProcedure.parameters[0].type, 'Code[20]');
	});

	test('getProcedureToCreate_OfOtherObject', async () => {
		let procedureName = 'MissingProcedureOfOtherObject';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0132.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0132(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.internal);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myBoolean');
		assert.strictEqual(alProcedure.parameters[1].type, 'Boolean');
		assert.strictEqual(alProcedure.ObjectOfProcedure.name, "SecondCodeunit");
	});
	test('getProcedureToCreate_OfOtherObjectWithReturn', async () => {
		let procedureName = 'MissingProcedureOfOtherObjectWithReturn';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0132.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0132(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.internal);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), "Text[20]");
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myBoolean');
		assert.strictEqual(alProcedure.parameters[1].type, 'Boolean');
		assert.strictEqual(alProcedure.ObjectOfProcedure.name, "SecondCodeunit");
	});
	test('getProcedureToCreate_MissingPublicProcedureOfSameObjectWithReturn', async () => {
		let procedureName = 'MissingPublicProcedureOfSameObjectWithReturn';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0132.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0132(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.internal);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), "Text[20]");
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myBoolean');
		assert.strictEqual(alProcedure.parameters[1].type, 'Boolean');
		assert.strictEqual(alProcedure.ObjectOfProcedure.name, '"FirstCodeunit"');
	});
	test('getProcedureToCreate_PagePart', async () => {
		let procedureName = 'DoSomething';
		let rangeOfProcedureName = getRangeOfProcedureName(mainPageDocument, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0132.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0132(mainPageDocument, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.internal);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 0);
		assert.strictEqual(alProcedure.ObjectOfProcedure.name, 'MySalesSubpage');
	});

	test('getProcedureToCreate_ProcedureWithProcedureCallInside1', async () => {
		let procedureName = 'MissingProcedureWithProcedureCallInside1';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myProcedure');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});
	test('getProcedureToCreate_ProcedureWithProcedureCallInside2', async () => {
		let procedureName = 'MissingProcedureWithProcedureCallInside2';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myProcedureWithTwoParams');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[1].type, 'Integer');
	});
	test('getProcedureToCreate_ProcedureWithProcedureCallInside3', async () => {
		let procedureName = 'MissingProcedureWithProcedureCallInside3';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myProcedure');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[1].type, 'Integer');
	});
	test('getProcedureToCreate_MissingProcedureInNonExistingOverload', async () => {
		let procedureName = 'MissingProcedureInNonExistingOverload';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 0);
		assert.strictEqual(alProcedure.isReturnTypeRequired(), true, 'return type required')
	});
	test('getProcedureToCreate_ReturnValueDirectlyUsed', async () => {
		let procedureName = 'MissingProcedureWithDirectlyUsedReturnValue';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), "Text");
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_ReturnValueDirectlyUsedInMemberExpression', async () => {
		let procedureName = 'MissingProcedureWithDirectlyUsedReturnValueInMemberExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), "Text");
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_MultilineProcedureCall', async () => {
		let procedureName = 'MultilineProcedureCall';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = SupportedDiagnosticCodes.AL0118.toString();
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myInteger');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
		assert.strictEqual(alProcedure.parameters[0].isVar, false);
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myBoolean');
		assert.strictEqual(alProcedure.parameters[1].type, 'Boolean');
		assert.strictEqual(alProcedure.parameters[1].isVar, false);
	});
	test('getProcedureToCreate_CallingProcedureWithParameterIncludingBrackets', async function () {
		let procedureName = 'creatableProcedure';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'LineDisplay');
		assert.strictEqual(alProcedure.parameters[0].type, 'Option');
	});
	test('getProcedureToCreate_RecOnRunTrigger', async function () {
		let procedureName = 'ProcedureWithRecInOnRunTrigger';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'Rec');
		assert.strictEqual(alProcedure.parameters[0].type, 'Record MyTable');
		assert.strictEqual(alProcedure.parameters[0].isVar, false);
	});

	//Currently these tests can't run on a pipeline because the executeDefinitionProvider fails in finding the symbols.
	test('getProcedureToCreate_FieldsOfOtherAppAsParameter', async function () {
		let procedureName = 'MissingProcedureWithFieldsOfOtherAppAsParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 4);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'No');
		assert.strictEqual(alProcedure.parameters[0].type, "Code[20]");
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'Reserve1');
		assert.strictEqual(alProcedure.parameters[1].type, 'Enum "Reserve Method"');
		assert.strictEqual(alProcedure.parameters[2].getNameOrEmpty(), 'ApplicationMethod');
		assert.strictEqual(alProcedure.parameters[2].type, 'Option');
		assert.strictEqual(alProcedure.parameters[3].getNameOrEmpty(), 'Reserve2');
		assert.strictEqual(alProcedure.parameters[3].type, 'Enum "Reserve Method"');
	}); //first time interacting with the symbols and another extensin can take some time.
	test('getProcedureToCreate_FieldsOfSameAppAsParameter', async function () {
		let procedureName = 'MissingProcedureWithFieldsOfSameAppAsParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'MyField');
		assert.strictEqual(alProcedure.parameters[0].type, "Integer");
	});

	test('getProcedureToCreate_TwoFieldsWithSameNameAsParameter1', async function () {
		let procedureName = 'MissingProcedureWithTwoFieldsWithSameNameAsParameter1';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'No1');
		assert.strictEqual(alProcedure.parameters[0].type, "Code[20]");
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'No2');
		assert.strictEqual(alProcedure.parameters[1].type, "Code[20]");
	});
	test('getProcedureToCreate_TwoFieldsWithSameNameAsParameter2', async function () {
		let procedureName = 'MissingProcedureWithTwoFieldsWithSameNameAsParameter2';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'No1');
		assert.strictEqual(alProcedure.parameters[0].type, "Code[20]");
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'No2');
		assert.strictEqual(alProcedure.parameters[1].type, "Code[20]");
	});
	test('getProcedureToCreate_QuotedNameAsParameterWhichMissesQuotes', async function () {
		let procedureName = 'MissingProcedureWithQuotedNameAsParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'SalesOrderTestPage');
		assert.strictEqual(alProcedure.parameters[0].type, 'TestPage "Sales Order"');
	});
	test('getProcedureToCreate_MissingProcedureWithObjectIdAsParameter', async function () {
		let procedureName = 'MissingProcedureWithObjectIdAsParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'TableId');
		assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
	});

	test('getProcedureToCreate_PrimitiveTypes', async function () {
		let procedureName = 'MissingProcedureWithPrimitiveTypes';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 4);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'arg1');
		assert.strictEqual(alProcedure.parameters[0].type, "Text");
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'arg2');
		assert.strictEqual(alProcedure.parameters[1].type, "Integer");
		assert.strictEqual(alProcedure.parameters[2].getNameOrEmpty(), 'arg3');
		assert.strictEqual(alProcedure.parameters[2].type, "Decimal");
		assert.strictEqual(alProcedure.parameters[3].getNameOrEmpty(), 'arg4');
		assert.strictEqual(alProcedure.parameters[3].type, "Boolean");
	});
	test('getProcedureToCreate_IfStatement', async function () {
		let procedureName = 'MissingProcedureInsideIfStatement';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Boolean');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_AssignmentStatement', async function () {
		let procedureName = 'MissingProcedureInAssignmentStatement';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Boolean');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_LogicalOrStatement', async function () {
		let procedureName = 'MissingProcedureInLogicalOrStatement';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Boolean');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_LogicalAndStatement', async function () {
		let procedureName = 'MissingProcedureInLogicalAndStatement';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Boolean');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_UnaryNotStatement', async function () {
		let procedureName = 'MissingProcedureWithUnaryNotExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Boolean');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_LessThanExpression', async function () {
		let procedureName = 'MissingProcedureLessThanExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_LessOrEqualsThanExpression', async function () {
		let procedureName = 'MissingProcedureLessOrEqualsThanExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_GreaterThanExpression', async function () {
		let procedureName = 'MissingProcedureGreatherThanExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_GreaterOrEqualsThanExpression', async function () {
		let procedureName = 'MissingProcedureGreatherOrEqualsThanExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_EqualsExpression', async function () {
		let procedureName = 'MissingProcedureEqualsExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_NotEqualsExpression', async function () {
		let procedureName = 'MissingProcedureNotEqualsExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_AddExpression', async function () {
		let procedureName = 'MissingProcedureInAddExpression';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_VariableListDeclaredVariables', async function () {
		let procedureName = 'MissingProcedureWithVariableListDeclaredVariables';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Decimal');
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'myDecimal1');
		assert.strictEqual(alProcedure.parameters[0].type, 'Decimal');
		assert.strictEqual(alProcedure.parameters[0].isVar, false);
	});
	test('getProcedureToCreate_MissingProcedureWithTempRec', async function () {
		let procedureName = 'MissingProcedureWithTempRec';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'TempMyTable');
		assert.strictEqual(alProcedure.parameters[0].type, 'Record MyTable temporary');
		assert.strictEqual(alProcedure.parameters[0].isVar, true);
	});
	test('getProcedureToCreate_Parenthesis', async function () {
		let procedureName = 'MissingProcedureInParenthesis';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Boolean');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_Interface', async function () {
		let procedureName = 'MyInterfaceProcedure';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0132';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0132(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.internal);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 0);
	});

	test('getProcedureToCreate_InsideExitStatement', async function () {
		let procedureName = 'MissingProcedureInExitStatement';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, 'Integer');
		assert.strictEqual(alProcedure.parameters.length, 0);
	});

	test('getProcedureToCreate_TestProcedure', async function () {
		let procedureName = 'TestfuncInTestProcedure';
		let rangeOfProcedureName = getRangeOfProcedureName(testcodeunitDocument, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(testcodeunitDocument, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 0);
	});


	test('getProcedureToCreate_EventSubscriber', async function () {
		let procedureName = 'testfuncInSubscriber';
		let rangeOfProcedureName = getRangeOfProcedureName(codeunit1Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(codeunit1Document, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 0);
	});
	test('getProcedureToCreate_Table_OnValidateOfTableField', async function () {
		let procedureName = 'CreatableProcedure1';
		let rangeOfProcedureName = getRangeOfProcedureName(tableDocument, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(tableDocument, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), "Boolean");
		assert.strictEqual(alProcedure.parameters.length, 1);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'MyField');
		assert.strictEqual(alProcedure.parameters[0].type, "Integer");
	});
	test('getProcedureToCreate_Table_OnInsertTrigger', async function () {
		let procedureName = 'CreatableProcedure2';
		let rangeOfProcedureName = getRangeOfProcedureName(tableDocument, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(tableDocument, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.notStrictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.getReturnTypeAsString(), "Integer");
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'MyField');
		assert.strictEqual(alProcedure.parameters[0].type, "Integer");
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'myInt');
		assert.strictEqual(alProcedure.parameters[1].type, "Integer");
	});
	test('getProcedureToCreate_Table_RecsAsParameter', async function () {
		let procedureName = 'MissingProcedureWithRecsAsParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(tableDocument, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(tableDocument, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'Rec');
		assert.strictEqual(alProcedure.parameters[0].type, 'Record MyTable');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'xRec');
		assert.strictEqual(alProcedure.parameters[1].type, 'Record MyTable');
	});
	test('getProcedureToCreate_Page_RecsAsParameter', async function () {
		let procedureName = 'MissingProcedureWithRecsAsParameter';
		let rangeOfProcedureName = getRangeOfProcedureName(pageDocument, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let alProcedure = await CreateProcedure.createProcedure(new CreateProcedureAL0118(pageDocument, diagnostic));
		assert.notStrictEqual(alProcedure, undefined, 'Procedure should be created');
		alProcedure = alProcedure as ALProcedure;
		assert.strictEqual(alProcedure.name, procedureName);
		assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
		assert.strictEqual(alProcedure.returnType, undefined);
		assert.strictEqual(alProcedure.parameters.length, 2);
		assert.strictEqual(alProcedure.parameters[0].getNameOrEmpty(), 'Rec');
		assert.strictEqual(alProcedure.parameters[0].type, 'Record Vendor');
		assert.strictEqual(alProcedure.parameters[1].getNameOrEmpty(), 'xRec');
		assert.strictEqual(alProcedure.parameters[1].type, 'Record Vendor');
	});
	test('getProcedureToCreate_ImplicitWithSourceTable', async function () {
		let procedureName = 'testproc';
		let rangeOfProcedureName = getRangeOfProcedureName(myPage2Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let codeActionProvider = new CodeActionProviderAL0118(myPage2Document, diagnostic);
		let consider: boolean = await codeActionProvider.considerLine();
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		assert.strictEqual(codeActions[0].command?.command, Command.createProcedureCommand);
		assert.strictEqual(codeActions[0].title, 'Create procedure testproc on source table');
		let document: TextDocument = codeActions[0].command.arguments![0]
		let procedure: ALProcedure = codeActions[0].command.arguments![1]
		assert.strictEqual(document.uri.fsPath.endsWith('MyTable.al'), true)
		assert.strictEqual(procedure.accessModifier, AccessModifier.internal)
		assert.strictEqual(procedure.ObjectOfProcedure.name, 'MyTable')
		assert.strictEqual(procedure.ObjectOfProcedure.type, 'Table')

		assert.strictEqual(codeActions[1].command?.command, Command.createProcedureCommand);
		assert.strictEqual(codeActions[1].title, 'Create procedure testproc');
		document = codeActions[1].command.arguments![0]
		procedure = codeActions[1].command.arguments![1]
		assert.strictEqual(document.uri.fsPath.endsWith('MyPage2.al'), true)
		assert.strictEqual(procedure.accessModifier, AccessModifier.local)
		assert.strictEqual(procedure.ObjectOfProcedure.name, 'MyPage2')
		assert.strictEqual(procedure.ObjectOfProcedure.type, 'Page')
	});
	test('getProcedureToCreate_Rec_SourceTable', async function () {
		let procedureName = 'testproc2';
		let rangeOfProcedureName = getRangeOfProcedureName(myPage2Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0132';
		let codeActionProvider = new CodeActionProviderAL0132(myPage2Document, diagnostic);
		let consider: boolean = await codeActionProvider.considerLine();
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 1, 'Code action should be created');
		assert.strictEqual(codeActions[0].command?.command, Command.createProcedureCommand);
		assert.strictEqual(codeActions[0].title, 'Create procedure testproc2 on source table');
		let document: TextDocument = codeActions[0].command.arguments![0]
		let procedure: ALProcedure = codeActions[0].command.arguments![1]
		assert.strictEqual(document.uri.fsPath.endsWith('MyTable.al'), true)
		assert.strictEqual(procedure.accessModifier, AccessModifier.internal)
		assert.strictEqual(procedure.ObjectOfProcedure.name, 'MyTable')
		assert.strictEqual(procedure.ObjectOfProcedure.type, 'Table')
	});
	test('getProcedureToCreate_ImplicitButNoImplicitWith', async function () {
		let procedureName = 'testproc';
		let rangeOfProcedureName = getRangeOfProcedureName(myPage2Document, procedureName);
		let diagnostic: Diagnostic = new Diagnostic(rangeOfProcedureName, 'Procedure is missing');
		diagnostic.code = 'AL0118';
		let codeActionProvider = new CodeActionProviderAL0118(myPage2Document, diagnostic);
		let consider: boolean = await codeActionProvider.considerLine();
		assert.strictEqual(consider, true, 'Code action should be considered');
		WorkspaceUtils.addNoImplicitWithToAppJson();
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		WorkspaceUtils.onAppJsonFound = undefined
		assert.strictEqual(codeActions.length, 1, 'Code action should be created');

		assert.strictEqual(codeActions[0].command?.command, Command.createProcedureCommand);
		assert.strictEqual(codeActions[0].title, 'Create procedure testproc');
		let document: TextDocument = codeActions[0].command.arguments![0]
		let procedure: ALProcedure = codeActions[0].command.arguments![1]
		assert.strictEqual(document.uri.fsPath.endsWith('MyPage2.al'), true)
		assert.strictEqual(procedure.accessModifier, AccessModifier.local)
		assert.strictEqual(procedure.ObjectOfProcedure.name, 'MyPage2')
		assert.strictEqual(procedure.ObjectOfProcedure.type, 'Page')
	});


	function getRangeOfProcedureName(document: TextDocument, procedureName: string): Range {
		let line: number | undefined;
		for (let i = 0; i < document.lineCount; i++) {
			if (document.lineAt(i).text.includes(procedureName + '(')) {
				line = i;
				break;
			}
		}
		assert.notStrictEqual(line, undefined, 'line should be found.');
		line = line as number;
		let lineText = document.lineAt(line).text;
		let startPos = lineText.indexOf(procedureName);
		let endPos = lineText.indexOf('(', startPos);
		return new Range(line, startPos, line, endPos);
	}
});