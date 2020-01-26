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
		assert.equal(variables[0].type, "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].type, "Integer");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			"A: Integer; B: Integer");
	});
	test('parseParameterDeclarationStringToALVariableArray_WithoutSpaces', () => {
		let parameterDeclarationString = 'A:Integer;B:Integer';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].type, "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].type, "Integer");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'A: Integer; B: Integer');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithBrackets', () => {
		let parameterDeclarationString = 'A:Integer;B:Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].type, "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].type, "Text[250]");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'A: Integer; B: Text[250]');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithArray', () => {
		let parameterDeclarationString = 'A:Integer;B:Array[20] of Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].type, "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].type, "Array[20] of Text[250]");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'A: Integer; B: Array[20] of Text[250]');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithSpaces', () => {
		let parameterDeclarationString = '"my Int":Integer;B:Array[20] of Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, '"my Int"');
		assert.equal(variables[0].type, "Integer");
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].type, "Array[20] of Text[250]");
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'"my Int": Integer; B: Array[20] of Text[250]');
	});
	test('parseParameterDeclarationStringToALVariableArray_WithVarAndTemporary', () => {
		let parameterDeclarationString = 'var A:Record Customer temporary;var B:Array[20] of Text[250]';
		let procedureName = 'myProcedure';
		let variables = ALParameterParser.parseParameterDeclarationStringToALVariableArray(parameterDeclarationString, procedureName);
		assert.equal(variables.length, 2);
		assert.equal(variables[0].name, 'A');
		assert.equal(variables[0].type, "Record Customer temporary");
		assert.equal(variables[0].isVar, true);
		assert.equal(variables[1].name, 'B');
		assert.equal(variables[1].type, "Array[20] of Text[250]");
		assert.equal(variables[1].isVar, true);
		assert.equal(ALParameterParser.parseALVariableArrayToParameterDeclarationString(variables), 
			'var A: Record Customer temporary; var B: Array[20] of Text[250]');
	});
});