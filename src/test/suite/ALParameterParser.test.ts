import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ALParameterParser } from '../../extension/alParameterParser';
// import * as myExtension from '../extension';

suite('ALParameterParser Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests of AL Parameter Parser.');

	test('parseParameterDeclarationStringToALVariableArray_Easy', () => {
		let parameterDeclarationString = 'A: Integer; B: Integer';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].getTypeDefinition(), "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].getTypeDefinition(), "Integer");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			"A: Integer; B: Integer");
	});
	test('parseParameterDeclarationStringToALVariableArray_WithoutSpaces', () => {
		let parameterDeclarationString = 'A:Integer;B:Integer';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].getTypeDefinition(), "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].getTypeDefinition(), "Integer");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'A: Integer; B: Integer');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithBrackets', () => {
		let parameterDeclarationString = 'A:Integer;B:Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].getTypeDefinition(), "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].getTypeDefinition(), "Text[250]");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'A: Integer; B: Text[250]');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithArray', () => {
		let parameterDeclarationString = 'A:Integer;B:Array[20] of Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].getTypeDefinition(), "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].getTypeDefinition(), "array[20] of Text[250]");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'A: Integer; B: array[20] of Text[250]');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithSpaces', () => {
		let parameterDeclarationString = '"my Int":Integer;B:Array[20] of Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, '"my Int"');
		assert.equal(variables[0].getTypeDefinition(), "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].getTypeDefinition(), "array[20] of Text[250]");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'"my Int": Integer; B: array[20] of Text[250]');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithVarAndTemporary', () => {
		let parameterDeclarationString = 'var A:Record Customer temporary;var B:Array[20] of Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].type, "Record");
		assert.equal(variables[0].subtype, "Customer");
		assert.equal(variables[0].isTemporary, true);
		assert.equal(variables[0].getTypeDefinition(), 'Record Customer');
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].getTypeDefinition(), "array[20] of Text[250]");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'var A: Record Customer temporary; var B: array[20] of Text[250]');
	});
});