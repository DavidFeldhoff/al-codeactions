import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ALParameterHandler } from '../../extension/alParameterHandler';
import { ALVariableMgmt } from '../../extension/alVariableMgmt';
// import * as myExtension from '../extension';

suite('ALVariableMgmt Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests of AL Variable Mgmt.');

	test('parseVariableDeclarationStringToVariable_Easy', () => {
		let variableDeclarationString = 'I: Integer;';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), "Integer");
		assert.equal(variable.type, "Integer");
		assert.equal(variable.subtype, undefined);
		assert.equal(variable.dimensions, undefined);
		assert.equal(variable.length, undefined);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_VariableHasQuotes', () => {
		let variableDeclarationString = '"I": Integer;';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, '"I"');
		assert.equal(variable.getTypeDefinition(), "Integer");
		assert.equal(variable.type, "Integer");
		assert.equal(variable.subtype, undefined);
		assert.equal(variable.dimensions, undefined);
		assert.equal(variable.length, undefined);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_VariableHasQuotesAndSpaces', () => {
		let variableDeclarationString = '"I m": Integer;';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, '"I m"');
		assert.equal(variable.getTypeDefinition(), "Integer");
		assert.equal(variable.type, "Integer");
		assert.equal(variable.subtype, undefined);
		assert.equal(variable.dimensions, undefined);
		assert.equal(variable.length, undefined);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_ObjectTypeHasQuotes', () => {
		let variableDeclarationString = 'I: Record "Customer";';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), 'Record "Customer"');
		assert.equal(variable.type, "Record");
		assert.equal(variable.subtype, '"Customer"');
		assert.equal(variable.dimensions, undefined);
		assert.equal(variable.length, undefined);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_ObjectTypeHasQuotesAndSpaces', () => {
		let variableDeclarationString = 'I: Record "Cust. Ledger Entry";';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), 'Record "Cust. Ledger Entry"');
		assert.equal(variable.type, "Record");
		assert.equal(variable.subtype, '"Cust. Ledger Entry"');
		assert.equal(variable.dimensions, undefined);
		assert.equal(variable.length, undefined);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_ObjectTypeHasBrackets', () => {
		let variableDeclarationString = 'I: Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), 'Text[250]');
		assert.equal(variable.type, "Text");
		assert.equal(variable.subtype, undefined);
		assert.equal(variable.dimensions, undefined);
		assert.equal(variable.length, 250);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_isOnedimensionalArray', () => {
		let variableDeclarationString = 'I: Array[20] of Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), 'array[20] of Text[250]');
		assert.equal(variable.type, "Text");
		assert.equal(variable.subtype, undefined);
		assert.equal(variable.dimensions, "20");
		assert.equal(variable.length, 250);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_isMultidimensionalArray', () => {
		let variableDeclarationString = 'I: Array[20, 2] of Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), 'array[20, 2] of Text[250]');
		assert.equal(variable.type, "Text");
		assert.equal(variable.subtype, undefined);
		assert.equal(variable.dimensions, "20, 2");
		assert.equal(variable.length, 250);
		assert.equal(variable.isVar, false);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_isMultidimensionalArrayWithVar', () => {
		let variableDeclarationString = 'var I: Array[20, 2] of Text[250];';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), 'array[20, 2] of Text[250]');
		assert.equal(variable.type, "Text");
		assert.equal(variable.subtype, undefined);
		assert.equal(variable.dimensions, "20, 2");
		assert.equal(variable.length, 250);
		assert.equal(variable.isVar, true);
		assert.equal(variable.isTemporary, false);
	});
	test('parseVariableDeclarationStringToVariable_isMultidimensionalArrayWithVarAndTemporary', () => {
		let variableDeclarationString = 'var I: Array[20, 2] of Record Customer temporary;';
		let procedureName = 'myProcedure';
		let variable = ALVariableMgmt.parseVariableDeclarationStringToVariable(variableDeclarationString, procedureName);
		assert.equal(variable.name, 'I');
		assert.equal(variable.getTypeDefinition(), 'array[20, 2] of Record Customer');
		assert.equal(variable.type, "Record");
		assert.equal(variable.subtype, "Customer");
		assert.equal(variable.dimensions, "20, 2");
		assert.equal(variable.length, undefined);
		assert.equal(variable.isVar, true);
		assert.equal(variable.isTemporary, true);
	});
});
