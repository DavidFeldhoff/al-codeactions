import * as assert from 'assert';
import * as path from 'path';
import { TextDocument, workspace, window, Position, Location, Range } from 'vscode';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { DefinitionProviderCallToTrigger } from '../../extension/Services/DefinitionProviderOnInsert';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

// import * as myExtension from '../extension';

suite('ALBuiltInFunctionDefinitionProvider Test Suite', function () {
	let codeunitDocument: TextDocument;
	let tableTriggersTableDoc: TextDocument;
	let vendorPageDoc: TextDocument;

	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();

		//open the file just once
		let fileName = path.resolve(ALTestProject.dir, 'TableTriggerReferences', 'CodeunitWithDifferentTableNo.Codeunit.al');
		await workspace.openTextDocument(fileName).then(doc => {
			codeunitDocument = doc;
		});
		fileName = path.resolve(ALTestProject.dir, 'TableTriggerReferences', 'TableTriggers.Table.al');
		await workspace.openTextDocument(fileName).then(doc => {
			tableTriggersTableDoc = doc;
		});
		fileName = path.resolve(ALTestProject.dir, 'TableTriggerReferences', 'VendorPage.Page.al');
		await workspace.openTextDocument(fileName).then(doc => {
			vendorPageDoc = doc;
		});

		window.showInformationMessage('Start all tests of ALBuiltInFunctionDefinitionProvider.');
	});

	test('GetInsertTrigger_Symbols_NoParantheses', async () => {
		let tableName: string = 'Customer';
		let lineTextToSearch = 'Customer.Insert;';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, (tableName + '.').length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)

		let expectedDefinitions: Map<string, string[]> = new Map();
		// expectedDefinitions.set('customer.TabExt.al', ['OnInsert']);
		expectedDefinitions.set('Customer.dal', ['OnInsert'])
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetInsertTrigger_Symbols_DefaultParameter', async () => {
		let tableName: string = 'Customer';
		let lineTextToSearch = 'Customer.Insert();';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, (tableName + '.').length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)

		let expectedDefinitions: Map<string, string[]> = new Map();
		// expectedDefinitions.set('customer.TabExt.al', ['OnInsert']);
		expectedDefinitions.set('Customer.dal', ['OnInsert'])
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetInsertTrigger_Symbols_WithParameter', async () => {
		let tableName: string = 'Customer';
		let lineTextToSearch = 'customer.Insert(false);';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, (tableName + '.').length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)

		let expectedDefinitions: Map<string, string[]> = new Map();
		// expectedDefinitions.set('customer.TabExt.al', ['OnInsert']);
		expectedDefinitions.set('Customer.dal', ['OnInsert'])
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetInsertTrigger_OwnProject', async () => {
		let tableName: string = 'TableTriggers';
		let lineTextToSearch = 'TableTriggers.Insert();';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, (tableName + '.').length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)

		let expectedDefinitions: Map<string, string[]> = new Map();
		// expectedDefinitions.set('CodeunitWithDifferentTableNo.Codeunit.al', ['TableTriggers_OnBeforeInsertEvent']);
		expectedDefinitions.set('TableTriggers.Table.al', ['OnInsert'])
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetInsertTrigger_NoTriggerProvided', async () => {
		let tableName: string = 'TableTriggers';
		let lineTextToSearch = 'TableTriggers.Delete();';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, (tableName + '.').length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)
		assert.strictEqual(locations.length, 0, 'Definition expected');
	});
	test('GetInsertTrigger_FieldFunction', async () => {
		let tableName: string = 'TableTriggers';
		let lineTextToSearch = 'TableTriggers.Validate(MyField, 5);';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, (tableName + '.').length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)
		assert.strictEqual(locations.length, 1, 'Definition expected');
		let targetDoc: TextDocument = await workspace.openTextDocument(locations[0].uri);
		assert.strictEqual(locations[0].uri.fsPath.includes('TableTriggers'), true);
		assert.strictEqual(targetDoc.getText(locations[0].range), 'OnValidate');
	});
	test('GetInsertTrigger_FieldFunctionWithMemberAccessExpression', async () => {
		let tableName: string = 'TableTriggers';
		let lineTextToSearch = 'TableTriggers.Validate(TableTriggers.MyField, 5);';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, (tableName + '.').length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)
		assert.strictEqual(locations.length, 1, 'Definition expected');
		let targetDoc: TextDocument = await workspace.openTextDocument(locations[0].uri);
		assert.strictEqual(locations[0].uri.fsPath.includes(tableName), true);
		assert.strictEqual(targetDoc.getText(locations[0].range), 'OnValidate');
	});
	test('GetInsertTrigger_ExplicitWith', async () => {
		let tableName: string = 'TableTriggers';
		let lineTextToSearch = 'Insert(true); //explicit should be referenced';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start;
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)
		
		let expectedDefinitions: Map<string, string[]> = new Map();
		// expectedDefinitions.set('CodeunitWithDifferentTableNo.Codeunit.al', ['TableTriggers_OnBeforeInsertEvent']);
		expectedDefinitions.set('TableTriggers.Table.al', ['OnInsert'])
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetInsertTrigger_ImplicitWith', async () => {
		let tableName: string = 'Vendor';
		let lineTextToSearch = 'Insert(); //implicit';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start;
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)
		assert.strictEqual(locations.length, 1, 'Definition expected');
		let targetDoc: TextDocument = await workspace.openTextDocument(locations[0].uri);
		assert.strictEqual(locations[0].uri.fsPath.includes(tableName), true);
		assert.strictEqual(targetDoc.getText(locations[0].range), 'OnInsert');
	});
	test('GetInsertTrigger_RecWith', async () => {
		let tableName: string = 'Vendor';
		let lineTextToSearch = 'Rec.Insert();';
		let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, 'Rec.'.length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)
		assert.strictEqual(locations.length, 1, 'Definition expected');
		let targetDoc: TextDocument = await workspace.openTextDocument(locations[0].uri);
		assert.strictEqual(locations[0].uri.fsPath.includes(tableName), true);
		assert.strictEqual(targetDoc.getText(locations[0].range), 'OnInsert');
	});
	test('GetInsertTrigger_RecTableImplicitWith', async () => {
		let tableName: string = 'TableTriggers';
		let lineTextToSearch = 'Insert(true); //implicit Rec';
		let rangeOfLine = getRangeOfLine(tableTriggersTableDoc, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start;
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(tableTriggersTableDoc, positionToExecuteDefProvider, cancellationToken)
		
		let expectedDefinitions: Map<string, string[]> = new Map();
		// expectedDefinitions.set('CodeunitWithDifferentTableNo.Codeunit.al', ['TableTriggers_OnBeforeInsertEvent']);
		expectedDefinitions.set('TableTriggers.Table.al', ['OnInsert'])
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetInsertTrigger_RecTableExplicitWith', async () => {
		let tableName: string = 'TableTriggers';
		let lineTextToSearch = 'Insert(true); //explicit Rec';
		let rangeOfLine = getRangeOfLine(tableTriggersTableDoc, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start;
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(tableTriggersTableDoc, positionToExecuteDefProvider, cancellationToken)
		
		let expectedDefinitions: Map<string, string[]> = new Map();
		// expectedDefinitions.set('CodeunitWithDifferentTableNo.Codeunit.al', ['TableTriggers_OnBeforeInsertEvent']);
		expectedDefinitions.set('TableTriggers.Table.al', ['OnInsert'])
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetInsertTrigger_PageImplicitWith', async () => {
		let tableName: string = 'Vendor.dal';
		let lineTextToSearch = 'Insert(); //implicit';
		let rangeOfLine = getRangeOfLine(vendorPageDoc, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start;
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(vendorPageDoc, positionToExecuteDefProvider, cancellationToken)
		assert.strictEqual(locations.length, 1, 'Definition expected');
		let targetDoc: TextDocument = await workspace.openTextDocument(locations[0].uri);
		assert.strictEqual(locations[0].uri.fsPath.includes(tableName), true);
		assert.strictEqual(targetDoc.getText(locations[0].range), 'OnInsert');
	});
	test('GetEventSubscriptionsAndTableExtensionsAsWellOfTableFunction', async () => {
		let lineTextToSearch = 'Item.Insert();';
		let rangeOfLine = getRangeOfLine(vendorPageDoc, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, 'Item.'.length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(vendorPageDoc, positionToExecuteDefProvider, cancellationToken)

		let expectedDefinitions: Map<string, string[]> = new Map();
		expectedDefinitions.set('Item.dal', ['OnInsert']);
		// expectedDefinitions.set('ItemExt.TableExt.al', ['OnInsert', 'OnBeforeInsert', 'OnAfterInsert'])
		// expectedDefinitions.set('CodeunitWithDifferentTableNo.Codeunit.al', ['Item_OnBeforeInsertEvent']);
		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetEventSubscriptionsAndTableExtensionsAsWellOfFieldFunction', async () => {
		let lineTextToSearch = 'Item.Validate("No.", \'Test\');';
		let rangeOfLine = getRangeOfLine(vendorPageDoc, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, 'Item.'.length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(vendorPageDoc, positionToExecuteDefProvider, cancellationToken)
		let expectedDefinitions: Map<string, string[]> = new Map();
		expectedDefinitions.set('Item.dal', ['OnValidate']);
		// expectedDefinitions.set('ItemExt.TableExt.al', ['OnBeforeValidate', 'OnAfterValidate'])

		await validateLocationsAndDefinitions(locations, expectedDefinitions)
	});
	test('GetFieldFunctionOfTableExtension', async () => {
		let lineTextToSearch = 'Item.Validate(Item.NewField, 5);';
		let rangeOfLine = getRangeOfLine(vendorPageDoc, lineTextToSearch);
		let positionToExecuteDefProvider: Position = rangeOfLine.start.translate(0, 'Item.'.length);
		let cancellationToken: any;
		let locations: Location[] = await new DefinitionProviderCallToTrigger().provideDefinition(vendorPageDoc, positionToExecuteDefProvider, cancellationToken)
		let expectedDefinitions: Map<string, string[]> = new Map();
		expectedDefinitions.set('ItemExt.TableExt.al', ['OnValidate'])

		await validateLocationsAndDefinitions(locations, expectedDefinitions)
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
});

async function validateLocationsAndDefinitions(locations: Location[], expectedDefinitions: Map<string, string[]>) {
	let expectedAmount: number = 0
	for (const key of expectedDefinitions.keys())
		expectedAmount += expectedDefinitions.get(key)!.length
	assert.strictEqual(locations.length, expectedAmount, 'Definitions expected');

	for (const key of expectedDefinitions.keys()) {
		let expectedValues: string[] = expectedDefinitions.get(key)!;
		assert.strictEqual(locations.some(l => l.uri.fsPath.includes(key)), true, '');
		let filteredLocations: Location[] = locations.filter(l => l.uri.fsPath.includes(key)) as Location[];
		assert.strictEqual(expectedValues.length, filteredLocations.length);

		let targetDoc: TextDocument = await workspace.openTextDocument(filteredLocations[0].uri);
		for (const location of filteredLocations) {
			let locationValue = targetDoc.getText(location.range)
			assert.strictEqual(expectedValues.some(value => value == locationValue), true);
		}
	}
}
