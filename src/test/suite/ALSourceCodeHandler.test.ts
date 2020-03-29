// import * as assert from 'assert';
// import * as path from 'path';

// // You can import and use all API from the 'vscode' module
// // as well as import your extension to test it
// import * as vscode from 'vscode';
// import { ALSourceCodeHandler } from '../../extension/alSourceCodeHandler';
// import { ALTestProject } from './ALTestProject';
// import { ALLanguageExtension } from '../../extension/alExtension';
// import { ALCodeOutlineExtension } from '../../extension/devToolsExtensionContext';
// // import * as myExtension from '../extension';

// suite('ALSourceCodeHandler Test Suite', function () {
// 	vscode.window.showInformationMessage('Start all tests of ALSourceCodeHandler.');
// 	let lineNo = 0;

// 	let sampleCodeunitURI: vscode.Uri;
// 	this.beforeAll('activateExtension', async () => {
// 		await ALLanguageExtension.getInstance().activate();
// 	}).timeout(0);

// 	//#region getALObjectOfDocument
// 	test('getALObjectOfDocument_ObjectNameWithoutSpace_BracketSameLine', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunitEmpty_MyCodeunit_BracketSameLine.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let alObject = new ALSourceCodeHandler(document).getALObjectOfDocument();
// 			assert.equal(alObject.name, 'MyCodeunit4');
// 			assert.equal(alObject.type, 'codeunit');
// 			assert.equal(alObject.id, 50106);
// 			assert.equal(alObject.document?.uri.fsPath, document.uri.fsPath);
// 		});
// 	});
// 	test('getALObjectOfDocument_ObjectNameWithoutSpace_BracketNextLine', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunitEmpty_MyCodeunit_BracketNextLine.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let alObject = new ALSourceCodeHandler(document).getALObjectOfDocument();
// 			assert.equal(alObject.name, 'MyCodeunit3');
// 			assert.equal(alObject.type, 'codeunit');
// 			assert.equal(alObject.id, 50105);
// 			assert.equal(alObject.document?.uri.fsPath, document.uri.fsPath);
// 		});
// 	});
// 	test('getALObjectOfDocument_ObjectNameWithSpace_BracketSameLine', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, "codeunitEmpty_'My Codeunit'_BracketSameLine.al");
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let alObject = new ALSourceCodeHandler(document).getALObjectOfDocument();
// 			assert.equal(alObject.name, '"My Codeunit"');
// 			assert.equal(alObject.type, 'codeunit');
// 			assert.equal(alObject.id, 50102);
// 			assert.equal(alObject.document?.uri.fsPath, document.uri.fsPath);
// 		});
// 	});
// 	test('getALObjectOfDocument_ObjectNameWithoutSpaceWithQuotes_BracketSameLine', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, "codeunitEmpty_'MyCodeunit'_BracketSameLine.al");
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let alObject = new ALSourceCodeHandler(document).getALObjectOfDocument();
// 			assert.equal(alObject.name, '"MyCodeunit"');
// 			assert.equal(alObject.type, 'codeunit');
// 			assert.equal(alObject.id, 50103);
// 			assert.equal(alObject.document?.uri.fsPath, document.uri.fsPath);
// 		});
// 	});
// 	test('getALObjectOfDocument_FirstLineHasComments', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunitEmpty_FirstLineHasComments.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let alObject = new ALSourceCodeHandler(document).getALObjectOfDocument();
// 			assert.equal(alObject.name, '"MyCodeunit2"');
// 			assert.equal(alObject.type, 'codeunit');
// 			assert.equal(alObject.id, 50104);
// 			assert.equal(alObject.document?.uri.fsPath, document.uri.fsPath);
// 		});
// 	});
// 	test('getALObjectOfDocument_PageExtension', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'pageExtensionEmpty.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let alObject = new ALSourceCodeHandler(document).getALObjectOfDocument();
// 			assert.equal(alObject.name, '"MyPageExtension"');
// 			assert.equal(alObject.type, 'pageextension');
// 			assert.equal(alObject.id, 50100);
// 			assert.equal(alObject.document?.uri.fsPath, document.uri.fsPath);
// 		});
// 	});
// 	//#endregion getALObjectOfDocument
// 	//#region getProcedureOrTriggerNameOfCurrentPosition
// 	test('getProcedureOrTriggerNameOfCurrentPosition_Procedure', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(async document => {
// 			let alProcedureName = (await ALCodeOutlineExtension.getProcedureOrTriggerSymbolOfCurrentLine(document.uri, 8)).name;
// 			assert.equal(alProcedureName, 'myProcedure');
// 		});
// 	});
// 	test('getProcedureOrTriggerNameOfCurrentPosition_Trigger', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(async document => {
// 			let alTriggerName = (await ALCodeOutlineExtension.getProcedureOrTriggerSymbolOfCurrentLine(document.uri, 4)).name;
// 			assert.equal(alTriggerName, 'onRun');
// 		});
// 	});
// 	//#endregion getProcedureOrTriggerNameOfCurrentPosition
// 	//#region getPositionToInsertProcedure
// 	test('getPositionToInsertProcedure_WithLine', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let position = new ALSourceCodeHandler(document).getPositionToInsertProcedure(17);
// 			assert.equal(position.isEqual(new vscode.Position(19, 8)), true);
// 		});
// 	});
// 	test('getPositionToInsertProcedure_BetweenProcedures', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let position = new ALSourceCodeHandler(document).getPositionToInsertProcedure(10);
// 			assert.equal(position.isEqual(new vscode.Position(11, 8)), true);
// 		});
// 	});
// 	test('getPositionToInsertProcedure_WithoutLine', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			let position = new ALSourceCodeHandler(document).getPositionToInsertProcedure(undefined);
// 			assert.equal(position.isEqual(new vscode.Position(50, 8)), true, `${position.line},${position.character}`);
// 		});
// 	});
// 	//#endregion getPositionToInsertProcedure

// 	//#region getRangeOfProcedureCall
// 	test('getRangeOfProcedureCall_WithoutParameters', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo = 26;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithoutParameters".length), 'test');
// 			diagnostic.code = 'AL0118';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			let expectedRange = new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithoutParameters()".length);
// 			assert.equal(range?.isEqual(expectedRange), true);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_WithParameter', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithParameter".length), 'test');
// 			diagnostic.code = 'AL0118';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			let expectedRange = new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithParameter(myInteger)".length);
// 			assert.equal(range?.isEqual(expectedRange), true);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_WithParameters', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithParameters".length), 'test');
// 			diagnostic.code = 'AL0118';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			let expectedRange = new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithParameters(myInteger, myBoolean)".length);
// 			assert.equal(range?.isEqual(expectedRange), true);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_WithReturnValue', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithReturn".length), 'test');
// 			diagnostic.code = 'AL0118';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			let expectedRange = new vscode.Range(lineNo, 8, lineNo, 8 + "myText := MissingProcedureWithReturn(myInteger)".length);
// 			assert.equal(range?.isEqual(expectedRange), true);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_OtherCodeunit', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureOfOtherObject".length), 'test');
// 			diagnostic.code = 'AL0132';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			let expectedRange = new vscode.Range(lineNo, 8, lineNo, 8 + "SecondCodeunit.MissingProcedureOfOtherObject(myInteger, myBoolean)".length);
// 			assert.equal(range?.isEqual(expectedRange), true);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_OtherCodeunitWithReturnValue', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureOfOtherObjectWithReturn".length), 'test');
// 			diagnostic.code = 'AL0132';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			let expectedRange = new vscode.Range(lineNo, 8, lineNo, 8 + "myText := SecondCodeunit.MissingProcedureOfOtherObjectWithReturn(myInteger, myBoolean)".length);
// 			assert.equal(range?.isEqual(expectedRange), true);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_WithProcedureCallInside', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithProcedureCallInside".length), 'test');
// 			diagnostic.code = 'AL0118';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			let expectedRange = new vscode.Range(lineNo, 8, lineNo, 8 + "MissingProcedureWithProcedureCallInside(myProcedure(5))".length);
// 			assert.equal(range?.isEqual(expectedRange), true);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_WithDirectlyUsedReturnValue', async () => {
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let startPos = 8 + "myProcedure(".length;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, startPos, lineNo, startPos + "MissingProcedureWithDirectlyUsedReturnValue".length), 'test');
// 			diagnostic.code = 'AL0118';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			//TODO: not supported yet.
// 			assert.equal(range, undefined);
// 			// let expectedRange = new vscode.Range(lineNo, startPos, lineNo, startPos + "MissingProcedureWithDirectlyUsedReturnValue()".length);
// 			// assert.equal(range?.isEqual(expectedRange), true, `start: line ${range?.start.line}, char: ${range?.start.character}, end: line ${range?.end.line}, char ${range?.end.character}`);
// 		});
// 	});
// 	test('getRangeOfProcedureCall_Multiline', async () => {
// 		//TODO: not supported yet.
// 		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
// 		await vscode.workspace.openTextDocument(fileName).then(document => {
// 			lineNo += 2;
// 			let diagnostic = new vscode.Diagnostic(new vscode.Range(lineNo, 8, lineNo, 8 + "MultilineProcedureCall".length), 'test');
// 			diagnostic.code = 'AL0118';
// 			diagnostic.source = 'al';
// 			let range = new ALSourceCodeHandler(document).expandRangeToRangeOfProcedureCall(diagnostic.range);
// 			assert.equal(range, undefined);
// 		});
// 	});
// 	//#endregion getRangeOfProcedureCall
// });
