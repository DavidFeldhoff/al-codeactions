import * as assert from 'assert';
import * as path from 'path';
import { TextDocument, workspace, window, Position, Location, Range } from 'vscode';
import { BuiltInFunctions } from '../../extension/DefinitionsOnInsert/BuiltInFunctions';
import { FindRelatedCalls, showInsertConfig } from '../../extension/Services/FindRelatedCalls';
import { FindRelatedEventSubscribers } from '../../extension/Services/FindRelatedEventSubscribers';
import { FindRelatedTriggersOfTableExt } from '../../extension/Services/FindRelatedTriggersOfTableExt';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

suite('ALBuiltInFunctionReferenceProvider Test Suite', function () {
	let codeunitDocument: TextDocument;
	let tableTriggersTableDoc: TextDocument;
	let ItemExtDoc: TextDocument;
	let myPageDocument: TextDocument;

	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();

		let fileName = path.resolve(ALTestProject.dir, 'TableTriggerReferences', 'TableTriggers.Table.al');
		await workspace.openTextDocument(fileName).then(doc => {
			tableTriggersTableDoc = doc;
		});
		fileName = path.resolve(ALTestProject.dir, 'ItemExt.TableExt.al');
		await workspace.openTextDocument(fileName).then(doc => {
			ItemExtDoc = doc;
		});

		window.showInformationMessage('Start all tests of ALBuiltInFunctionDefinitionProvider.');
	});

	test('GetInsertTrueCalls_TableTriggers.Table', async () => {
		let textToSkip: string = 'trigger ';
		let lineTextToSearch = 'trigger OnInsert()';
		let rangeOfLine = getRangeOfLine(tableTriggersTableDoc, lineTextToSearch);
		let positionToExecuteRefProvider: Position = rangeOfLine.start.translate(0, textToSkip.length);
		let cancellationToken: any;
		FindRelatedCalls.activateListener(BuiltInFunctions.Insert, showInsertConfig['Insert(true)-Calls only'])
		let locations: Location[] = await new FindRelatedCalls().provideReferences(tableTriggersTableDoc, positionToExecuteRefProvider, { includeDeclaration: true }, cancellationToken)

		let expected: Map<string, number> = new Map();
		expected.set('\\TableTriggers.Table.al', 4);
		expected.set('\\TableTriggers.Report.al', 1);
		expected.set('\\TableTriggers.Page.al', 2);
		expected.set('\\CodeunitWithTableNo.Codeunit.al', 2);
		expected.set('\\CodeunitWithDifferentTableNo.Codeunit.al', 2);
		validateLocations(expected, locations);
	});
	test('GetAllInsertCalls_TableTriggers.Table', async () => {
		let textToSkip: string = 'trigger ';
		let lineTextToSearch = 'trigger OnInsert()';
		let rangeOfLine = getRangeOfLine(tableTriggersTableDoc, lineTextToSearch);
		let positionToExecuteRefProvider: Position = rangeOfLine.start.translate(0, textToSkip.length);
		let cancellationToken: any;
		FindRelatedCalls.activateListener(BuiltInFunctions.Insert, showInsertConfig['All Insert-Calls'])
		let locations: Location[] = await new FindRelatedCalls().provideReferences(tableTriggersTableDoc, positionToExecuteRefProvider, { includeDeclaration: true }, cancellationToken)

		let expected: Map<string, number> = new Map();
		expected.set('\\TableTriggers.Table.al', 6);
		expected.set('\\TableTriggers.Report.al', 2);
		expected.set('\\TableTriggers.Page.al', 4);
		expected.set('\\CodeunitWithTableNo.Codeunit.al', 3);
		expected.set('\\CodeunitWithDifferentTableNo.Codeunit.al', 5);
		validateLocations(expected, locations);
	});
	test('GetEventSubscribers_TableTriggers.Table', async () => {
		let textToSkip: string = 'trigger ';
		let lineTextToSearch = 'trigger OnInsert()';
		let rangeOfLine = getRangeOfLine(tableTriggersTableDoc, lineTextToSearch);
		let positionToExecuteRefProvider: Position = rangeOfLine.start.translate(0, textToSkip.length);
		let cancellationToken: any;
		FindRelatedEventSubscribers.activateListener(BuiltInFunctions.Insert)
		let locations: Location[] = await new FindRelatedEventSubscribers().provideReferences(tableTriggersTableDoc, positionToExecuteRefProvider, { includeDeclaration: true }, cancellationToken)

		let expected: Map<string, number> = new Map();
		expected.set('\\CodeunitWithDifferentTableNo.Codeunit.al', 1);
		validateLocations(expected, locations);
	});
	test('GetTriggersOfTableExt_ItemExt.TableExt', async () => {
		let textToSkip: string = 'trigger ';
		let lineTextToSearch = 'trigger OnInsert()';
		let rangeOfLine = getRangeOfLine(ItemExtDoc, lineTextToSearch);
		let positionToExecuteRefProvider: Position = rangeOfLine.start.translate(0, textToSkip.length);
		let cancellationToken: any;
		FindRelatedTriggersOfTableExt.activateListener(BuiltInFunctions.Insert)
		let locations: Location[] = await new FindRelatedTriggersOfTableExt().provideReferences(ItemExtDoc, positionToExecuteRefProvider, { includeDeclaration: true }, cancellationToken)

		let expected: Map<string, number> = new Map();
		expected.set('\\ItemExt.TableExt.al', 3);
		validateLocations(expected, locations);
	});

	test('GetValidateCalls_TableTriggers.Table', async () => {
		let textToSkip: string = 'trigger ';
		let lineTextToSearch = 'trigger OnValidate()';
		let rangeOfLine = getRangeOfLine(tableTriggersTableDoc, lineTextToSearch);
		let positionToExecuteRefProvider: Position = rangeOfLine.start.translate(0, textToSkip.length);
		let cancellationToken: any;
		FindRelatedCalls.activateListener(BuiltInFunctions.Validate)
		let locations: Location[] = await new FindRelatedCalls().provideReferences(tableTriggersTableDoc, positionToExecuteRefProvider, { includeDeclaration: true }, cancellationToken)

		let expected: Map<string, number> = new Map();
		expected.set('\\CodeunitWithDifferentTableNo.Codeunit.al', 3);
		validateLocations(expected, locations);
	});
});

function getRangeOfLine(document: TextDocument, lineTextToSearch: string, startingAtLine: number = 0): Range {
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
	return new Range(line, startPos, line, endPos);
}

function validateLocations(expected: Map<string, number>, locations: Location[]) {
	let expectedLength = 0;
	for (const value of expected.values())
		expectedLength += value;

	assert.strictEqual(locations.length, expectedLength, 'References expected');
	for (const key of expected.keys())
		assert.strictEqual(locations.filter(location => location.uri.fsPath.includes(key)).length, expected.get(key)!, key);
}
