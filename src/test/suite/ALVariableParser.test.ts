import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ALVariableParser } from '../../extension/alVariableParser';
// import * as myExtension from '../extension';

suite('ALVariableParser Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests of AL Variable Parser.');

	test('parseVariableDeclarationStringToVariable_Easy', () => {
		let variableDeclarationString = 'I: Integer;';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, "Integer");
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_VariableHasQuotes', () => {
		let variableDeclarationString = '"I": Integer;';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, '"I"');
		assert.equal(variable.type, "Integer");
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_VariableHasQuotesAndSpaces', () => {
		let variableDeclarationString = '"I m": Integer;';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, '"I m"');
		assert.equal(variable.type, "Integer");
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_ObjectTypeHasQuotes', () => {
		let variableDeclarationString = 'I: Record "Customer";';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, "Record");
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_ObjectTypeHasQuotesAndSpaces', () => {
		let variableDeclarationString = 'I: Record "Cust. Ledger Entry";';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, 'Record "Cust. Ledger Entry"');
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_ObjectTypeHasBrackets', () => {
		let variableDeclarationString = 'I: Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, "Text[250]");
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_isOnedimensionalArray', () => {
		let variableDeclarationString = 'I: Array[20] of Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, "Array[20] of Text[250]");
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_isMultidimensionalArray', () => {
		let variableDeclarationString = 'I: Array[20, 2] of Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, "Array[20, 2] of Text[250]");
		assert.equal(variable.isVar, false);
	});
	test('parseVariableDeclarationStringToVariable_isMultidimensionalArrayWithVar', () => {
		let variableDeclarationString = 'var I: Array[20, 2] of Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, "Array[20, 2] of Text[250]");
		assert.equal(variable.isVar, true);
	});
	test('parseVariableDeclarationStringToVariable_isMultidimensionalArrayWithVarAndTemporary', () => {
		let variableDeclarationString = 'var I: Array[20, 2] of Record Customer temporary;';
		let procedureName = 'myProcedure';
		let variable = ALVariableParser.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.type, "Array[20, 2] of Record Customer temporary");
		assert.equal(variable.isVar, true);
	});
});
