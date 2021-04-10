import * as assert from 'assert';
import * as path from 'path';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { CodeActionProviderRefactorToValidate } from '../../extension/Services/CodeActionProviderRefactorToValidate';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

// import * as myExtension from '../extension';

suite('RefactorValidate Test Suite', function () {
	let codeunit1Document: vscode.TextDocument;
	let rootPath: string;

	this.timeout(0);
	this.beforeAll('beforeTests', async function () {
		this.timeout(0);
		await ALLanguageExtension.getInstance().activate();
		if (vscode.workspace.workspaceFolders)
			rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

		//open the file just once
		let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
		await vscode.workspace.openTextDocument(fileName).then(document => {
			codeunit1Document = document;
		});

		vscode.window.showInformationMessage('Start all tests of CodeActionProviderRefactorToValidate.');
	});

	test('refactorByPosition', async () => {
		let assignmentStatement = 'MyTable.MyField := MissingProcedureWithFieldReturn1(myInteger);';
		let rangeOfAssignmentStatement = getRangeOfAssignmentStatement(codeunit1Document, assignmentStatement);
		let positionToExecute: vscode.Position = rangeOfAssignmentStatement.start.translate(0, 'MyTable.MyField '.length);

		let tmpDoc: vscode.TextDocument = await vscode.workspace.openTextDocument({ language: 'al', content: codeunit1Document.getText() })
		let codeActions: vscode.CodeAction[] = await new CodeActionProviderRefactorToValidate(tmpDoc, new vscode.Range(positionToExecute, positionToExecute)).createCodeActions();
		assert.strictEqual(codeActions.length, 1, 'Expected one codeAction');
		assert.notStrictEqual(codeActions[0].edit, undefined, 'workspaceedit expected')
		let edit = codeActions[0].edit as vscode.WorkspaceEdit;
		await vscode.workspace.applyEdit(edit);
		let lineText: string = tmpDoc.lineAt(positionToExecute.line).text.trim();
		assert.strictEqual(lineText, 'MyTable.Validate(MyField, MissingProcedureWithFieldReturn1(myInteger));', 'wrong refactoring to validate')
		await vscode.window.showTextDocument(tmpDoc)
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
	});
	test('refactorByRangeOfOneLine', async () => {
		let assignmentStatement = 'MyTable.MyField := MissingProcedureWithFieldReturn1(myInteger);';
		let rangeOfAssignmentStatement = getRangeOfAssignmentStatement(codeunit1Document, assignmentStatement);

		let tmpDoc: vscode.TextDocument = await vscode.workspace.openTextDocument({ language: 'al', content: codeunit1Document.getText() })
		let codeActions: vscode.CodeAction[] = await new CodeActionProviderRefactorToValidate(tmpDoc, rangeOfAssignmentStatement).createCodeActions();
		assert.strictEqual(codeActions.length, 1, 'Expected one codeAction');
		assert.notStrictEqual(codeActions[0].edit, undefined, 'workspaceedit expected')
		let edit = codeActions[0].edit as vscode.WorkspaceEdit;
		await vscode.workspace.applyEdit(edit);
		let lineText: string = tmpDoc.lineAt(rangeOfAssignmentStatement.start.line).text.trim();
		assert.strictEqual(lineText, 'MyTable.Validate(MyField, MissingProcedureWithFieldReturn1(myInteger));', 'wrong refactoring to validate')
		await vscode.window.showTextDocument(tmpDoc)
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
	});
	test('refactorMultipleLines', async () => {
		let assignmentStatement = 'MyTable.MyField := MissingProcedureWithFieldReturn1(myInteger);';
		let rangeOfAssignmentStatement = getRangeOfAssignmentStatement(codeunit1Document, assignmentStatement);
		let textOfOtherLine: string = codeunit1Document.lineAt(rangeOfAssignmentStatement.start.line + 2).text;
		let rangeOfAssignmentStatements: vscode.Range = new vscode.Range(rangeOfAssignmentStatement.start, new vscode.Position(rangeOfAssignmentStatement.start.line + 2, textOfOtherLine.length))

		let tmpDoc: vscode.TextDocument = await vscode.workspace.openTextDocument({ language: 'al', content: codeunit1Document.getText() })
		let codeActions: vscode.CodeAction[] = await new CodeActionProviderRefactorToValidate(tmpDoc, rangeOfAssignmentStatements).createCodeActions();
		assert.strictEqual(codeActions.length, 1, 'Expected one codeAction');
		assert.notStrictEqual(codeActions[0].edit, undefined, 'workspaceedit expected')
		let edit = codeActions[0].edit as vscode.WorkspaceEdit;
		await vscode.workspace.applyEdit(edit);
		let textOfOtherLineNew: string = tmpDoc.lineAt(rangeOfAssignmentStatement.start.line + 2).text;
		let rangeOfAssignmentStatementsNew: vscode.Range = new vscode.Range(rangeOfAssignmentStatement.start, new vscode.Position(rangeOfAssignmentStatement.start.line + 2, textOfOtherLineNew.length))
		let lineText: string = tmpDoc.getText(rangeOfAssignmentStatementsNew)
		assert.strictEqual(
			lineText,
			'MyTable.Validate(MyField, MissingProcedureWithFieldReturn1(myInteger));\r\n' +
			'        "MyTable".Validate(MyField, MissingProcedureWithFieldReturn2(myInteger));\r\n' +
			'        MyTable.Validate("MyField", MissingProcedureWithFieldReturn3(myInteger));',
			'wrong refactoring to validate')
		await vscode.window.showTextDocument(tmpDoc)
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
	});


	function getRangeOfAssignmentStatement(document: vscode.TextDocument, assignmentStatement: string): vscode.Range {
		let line: number | undefined;
		for (let i = 0; i < document.lineCount; i++) {
			if (document.lineAt(i).text.includes(assignmentStatement)) {
				line = i;
				break;
			}
		}
		assert.notStrictEqual(line, undefined, 'line should be found.');
		line = line as number;
		let lineText = document.lineAt(line).text;
		let startPos = lineText.indexOf(assignmentStatement);
		let endPos = startPos + assignmentStatement.length;
		return new vscode.Range(line, startPos, line, endPos);
	}
});