import * as assert from 'assert';
import * as path from 'path';
import { CodeAction, CodeActionTriggerKind, Range, TextDocument, TextEdit, window, workspace } from 'vscode';
import { TextRangeExt } from '../../extension/AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../../extension/AL Code Outline/alFullSyntaxTreeNode';
import { ALVariable } from '../../extension/Entities/alVariable';
import { Command } from '../../extension/Entities/Command';
import { CodeActionProviderModifyProcedureDeclaration } from '../../extension/Services/CodeActionProviderModifyProcedureDeclaration';
import { CommandModifyProcedure } from '../../extension/Services/CommandModifyProcedure';
import { Config } from '../../extension/Utils/config';
import { DocumentUtils } from '../../extension/Utils/documentUtils';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';
import { TestHelper } from './TestHelper';

// import * as myExtension from '../extension';

suite('ALModifyProcedureCA Test Suite', function () {
	let codeunitInternal: TextDocument;
	let codeunitPublic: TextDocument;
	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();

		//open the file just once
		let modifyProcDir = path.resolve(ALTestProject.dir, 'ModifyProcedure')
		codeunitInternal = await workspace.openTextDocument(path.resolve(modifyProcDir, 'TestModifyProcedureInternal.Codeunit.al'));
		codeunitPublic = await workspace.openTextDocument(path.resolve(modifyProcDir, 'TestModifyProcedurePublic.Codeunit.al'))

		window.showInformationMessage('Start all tests of ALModifyProcedureCA.');
	});

	test('addParameter_SameCodeunit', async () => {
		let lineTextToSearch = 'LocalProcedureOneParam(Customer, MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], false);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')
		assert.strictEqual(textEdits![1].newText, "\r\n    local procedure LocalProcedureOneParam(Customer: Record Customer)\r\n    begin\r\n        LocalProcedureOneParam(Customer, false);\r\n    end;\r\n")
	}).timeout(3000); //First time opening something can take a little bit longer

	test('addParameter_SameCodeunit_SimpleTypeAsVar', async () => {
		let lineTextToSearch = 'LocalProcedureOneParam(Customer, IsHandled);'; //IsHandled is a var-parameter due to the setting "alCodeActions.varParameters"
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'IsHandled')
		assert.strictEqual(missingParameters[0].isVar, true)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; var IsHandled: Boolean')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'IsHandled')
		assert.strictEqual(missingParameters[0].isVar, true)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], false);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; var IsHandled: Boolean')
		assert.strictEqual(textEdits![1].newText, "\r\n    local procedure LocalProcedureOneParam(Customer: Record Customer)\r\n    var\r\n        IsHandled: Boolean;\r\n    begin\r\n        LocalProcedureOneParam(Customer, IsHandled);\r\n    end;\r\n")
	})

	test('addParameter_SameCodeunit_ObsoleteOldOne', async () => {
		let lineTextToSearch = 'LocalProcedureOneParam(Customer, MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], true);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')
		assert.strictEqual(textEdits![1].newText, "\r\n    [Obsolete('Please use the overload with 2 parameters.', 'v1.0.0.0')]\r\n    local procedure LocalProcedureOneParam(Customer: Record Customer)\r\n    begin\r\n        LocalProcedureOneParam(Customer, false);\r\n    end;\r\n")
	})
	test('addParameter_SameCodeunit_ObsoleteOldOne_Text', async () => {
		let lineTextToSearch = 'LocalProcedureOneParam(Customer, MyText);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyText')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Text');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; MyText: Text')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyText')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Text');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], true);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; MyText: Text')
		assert.strictEqual(textEdits![1].newText, "\r\n    [Obsolete('Please use the overload with 2 parameters.', 'v1.0.0.0')]\r\n    local procedure LocalProcedureOneParam(Customer: Record Customer)\r\n    begin\r\n        LocalProcedureOneParam(Customer, '');\r\n    end;\r\n")
	})

	test('addParameter_SameCodeunit_ComplexType', async () => {
		let lineTextToSearch = 'LocalProcedureOneParam(Customer, MyBool, Vendor);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 2)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].type, 'Boolean');
		assert.strictEqual(missingParameters[1].getNameOrEmpty(), 'Vendor')
		assert.strictEqual(missingParameters[1].isVar, false)
		assert.strictEqual(missingParameters[1].type, 'Record Vendor');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean; Vendor: Record Vendor')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure LocalProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 2)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');
		assert.strictEqual(missingParameters[1].getNameOrEmpty(), 'Vendor')
		assert.strictEqual(missingParameters[1].isVar, false)
		assert.strictEqual(missingParameters[1].type, 'Record Vendor');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], false);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean; Vendor: Record Vendor')
		assert.strictEqual(textEdits![1].newText, "\r\n    local procedure LocalProcedureOneParam(Customer: Record Customer)\r\n    var\r\n        Vendor: Record Vendor;\r\n    begin\r\n        LocalProcedureOneParam(Customer, false, Vendor);\r\n    end;\r\n")
	})

	test('addParameter_SameCodeunit_ReturnSomething', async () => {
		let lineTextToSearch = 'ReturnSomething(MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure ReturnSomething(): Integer')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].type, 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, 'MyBool: Boolean')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure ReturnSomething(): Integer')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], false);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, 'MyBool: Boolean')
		assert.strictEqual(textEdits![1].newText, "\r\n    local procedure ReturnSomething(): Integer\r\n    begin\r\n        exit(ReturnSomething(false));\r\n    end;\r\n")
	})
	test('addParameter_SameCodeunit_ReturnSomethingNamed', async () => {
		let lineTextToSearch = 'ReturnSomethingNamed(MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure ReturnSomethingNamed() returnedInt: Integer')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].type, 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, 'MyBool: Boolean')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'local procedure ReturnSomethingNamed() returnedInt: Integer')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], false);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, 'MyBool: Boolean')
		assert.strictEqual(textEdits![1].newText, "\r\n    local procedure ReturnSomethingNamed() returnedInt: Integer\r\n    begin\r\n        returnedInt := ReturnSomethingNamed(false);\r\n    end;\r\n")
	})

	test('addParameter_DifferentCodeunit', async () => {
		let lineTextToSearch = 'TestModifyProcedure_Public.PublicProcedureOneParam(Customer, MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start.translate(0, 'TestModifyProcedure_Public.'.length);
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitPublic.uri.fsPath, 'Should be in different document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'procedure PublicProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitPublic.uri.fsPath, 'Should be in different document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'procedure PublicProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], false);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')
		assert.strictEqual(textEdits![1].newText, "\r\n    procedure PublicProcedureOneParam(Customer: Record Customer)\r\n    begin\r\n        PublicProcedureOneParam(Customer, false);\r\n    end;\r\n")
	}).timeout(3000); //First time opening something can take a little bit longer

	test('addParameter_DifferentCodeunit_ObsoleteOldOne', async () => {
		let lineTextToSearch = 'TestModifyProcedure_Public.PublicProcedureOneParam(Customer, MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start.translate(0, 'TestModifyProcedure_Public.'.length);
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitPublic.uri.fsPath, 'Should be in different document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'procedure PublicProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitPublic.uri.fsPath, 'Should be in different document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'procedure PublicProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], true);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean')
		assert.strictEqual(textEdits![1].newText, "\r\n    [Obsolete('Please use the overload with 2 parameters.', 'v1.0.0.0')]\r\n    procedure PublicProcedureOneParam(Customer: Record Customer)\r\n    begin\r\n        PublicProcedureOneParam(Customer, false);\r\n    end;\r\n")
	})

	test('addParameter_DifferentCodeunit_ComplexType', async () => {
		let lineTextToSearch = 'TestModifyProcedure_Public.PublicProcedureOneParam(Customer, MyBool, Vendor);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start.translate(0, 'TestModifyProcedure_Public.'.length);
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		assert.strictEqual(codeActions.length, 2, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitPublic.uri.fsPath, 'Should be in different document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'procedure PublicProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 2)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].type, 'Boolean');
		assert.strictEqual(missingParameters[1].getNameOrEmpty(), 'Vendor')
		assert.strictEqual(missingParameters[1].isVar, false)
		assert.strictEqual(missingParameters[1].type, 'Record Vendor');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean; Vendor: Record Vendor')

		let createOverloadCA = codeActions.find(entry => entry.command?.command == Command.createOverloadOfProcedure);
		assert.notStrictEqual(createOverloadCA, undefined)
		args = addParamCA!.command!.arguments!
		doc = args[0];
		methodNode = args[1];
		methodRange = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		missingParameters = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitPublic.uri.fsPath, 'Should be in different document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), 'procedure PublicProcedureOneParam(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 2)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, false)
		assert.strictEqual(missingParameters[0].getTypeShort(), 'Boolean');
		assert.strictEqual(missingParameters[1].getNameOrEmpty(), 'Vendor')
		assert.strictEqual(missingParameters[1].isVar, false)
		assert.strictEqual(missingParameters[1].type, 'Record Vendor');

		textEdits = await CommandModifyProcedure.getTextEditsToCreateOverloadOfProcedure(args[0], args[1], args[2], false);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 2)
		assert.strictEqual(textEdits![0].newText, '; MyBool: Boolean; Vendor: Record Vendor')
		assert.strictEqual(textEdits![1].newText, "\r\n    procedure PublicProcedureOneParam(Customer: Record Customer)\r\n    var\r\n        Vendor: Record Vendor;\r\n    begin\r\n        PublicProcedureOneParam(Customer, false, Vendor);\r\n    end;\r\n")
	})

	test('addParameter_EventSubscriber', async () => {
		let lineTextToSearch = 'OnPost(Customer, MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start;
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		await Config.setPublisherHasVarParametersOnly(undefined, true)
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, true, 'Code action should be considered');
		let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
		await Config.setPublisherHasVarParametersOnly(undefined, undefined); //reset config
		assert.strictEqual(codeActions.length, 1, 'Code action should be created');
		let addParamCA = codeActions.find(entry => entry.command?.command == Command.addParametersToProcedure)
		assert.notStrictEqual(addParamCA, undefined)
		let args: any[] = addParamCA!.command!.arguments!
		let doc: TextDocument = args[0];
		let methodNode: ALFullSyntaxTreeNode = args[1];
		let methodRange: Range = DocumentUtils.trimRange(doc, TextRangeExt.createVSCodeRange(methodNode.fullSpan));
		let missingParameters: ALVariable[] = args[2];
		assert.strictEqual(doc.uri.fsPath, codeunitInternal.uri.fsPath, 'Should be in same document')
		assert.strictEqual(doc.lineAt(methodRange.start).text.trimLeft(), '[IntegrationEvent(false, false)]')
		assert.strictEqual(doc.lineAt(methodRange.start.line + 1).text.trimLeft(), 'local procedure OnPost(Customer: Record Customer)')
		assert.strictEqual(missingParameters.length, 1)
		assert.strictEqual(missingParameters[0].getNameOrEmpty(), 'MyBool')
		assert.strictEqual(missingParameters[0].isVar, true)
		assert.strictEqual(missingParameters[0].type, 'Boolean');

		let textEdits: TextEdit[] | undefined = CommandModifyProcedure.getTextEditsToAddParametersToProcedure(args[0], args[1], args[2]);
		assert.notStrictEqual(textEdits, undefined)
		assert.strictEqual(textEdits!.length, 1)
		assert.strictEqual(textEdits![0].newText, '; var MyBool: Boolean')
	})

	test('addParameter_DALObject', async () => {
		let lineTextToSearch = 'Customer.CalcAvailableCredit(MyBool);';
		let procedureStartPos = TestHelper.getRangeOfLine(codeunitInternal, lineTextToSearch).start.translate(0, 'Customer.'.length);
		let codeActionProvider = new CodeActionProviderModifyProcedureDeclaration(codeunitInternal, new Range(procedureStartPos, procedureStartPos))
		let consider: boolean = await codeActionProvider.considerLine({diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Automatic });
		assert.strictEqual(consider, false, 'Code action should not be considered');
	})
});