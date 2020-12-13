import * as assert from 'assert';
import * as path from 'path';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { FullSyntaxTreeNodeKind } from '../../extension/AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNode } from '../../extension/AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../../extension/AL Code Outline/syntaxTree';
import { AccessModifier } from '../../extension/Entities/accessModifier';
import { ALProcedure } from '../../extension/Entities/alProcedure';
import { ReturnTypeAnalyzer } from '../../extension/Extract Procedure/returnTypeAnalyzer';
import { CodeActionProviderExtractProcedure } from '../../extension/Services/CodeActionProviderExtractProcedure';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';


suite('ALExtractProcedureCA Test Suite', function () {
    let codeunitToExtractDocument: vscode.TextDocument;
    let codeunit1Document: vscode.TextDocument;
    let syntaxTree: SyntaxTree;
    let tableDocument: vscode.TextDocument;
    this.timeout(0);
    this.beforeAll('beforeTests', async function () {
        this.timeout(0);
        await ALLanguageExtension.getInstance().activate();

        //open the file just once
        let fileName = path.resolve(ALTestProject.dir, 'codeunitToExtract.al');
        await vscode.workspace.openTextDocument(fileName).then(document => {
            codeunitToExtractDocument = document;
        });
        syntaxTree = await SyntaxTree.getInstance(codeunitToExtractDocument);

        fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
        await vscode.workspace.openTextDocument(fileName).then(document => {
            codeunit1Document = document;
        });

        vscode.window.showInformationMessage('Start all tests of ALExtractProcedure.');
    });

    test('MultipleDeclarationsOfVariablesInOneLine', async () => {
        let procedureName = 'OnRun';
        let textToExtractStart = 'start := 4;';
        let textToExtractEnd = 'result := start + (addend - 1) + 1;';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'integer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'result');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 2);
        assert.strictEqual(alProcedure.variables[0].type.toLowerCase(), 'integer');
        assert.strictEqual(alProcedure.variables[0].name.toLowerCase(), 'start');
        assert.strictEqual(alProcedure.variables[1].type.toLowerCase(), 'integer');
        assert.strictEqual(alProcedure.variables[1].name.toLowerCase(), 'addend');
    });
    test('Before_ProcedureWithOneParameterByValue', async () => {
        let procedureName = 'testProcedureWithOneParameterByValue';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        //current solution because everything is handed over as var
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
        //planned solution if not everything is handed over as var
        // assert.strictEqual(alProcedure.parameters.length, 0);
        // assert.strictEqual(alProcedure.variables.length, 1);
        // assert.strictEqual(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        // assert.strictEqual(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithTwoParametersByValue', async () => {
        let procedureName = 'testProcedureWithTwoParametersByValue';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        //current solution because everything is handed over as var
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
        //planned solution if not everything is handed over as var
        // assert.strictEqual(alProcedure.parameters.length, 0);
        // assert.strictEqual(alProcedure.variables.length, 1);
        // assert.strictEqual(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        // assert.strictEqual(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithMultilineParametersByValue', async () => {
        let procedureName = 'testProcedureWithMultilineParametersByValue';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        //current solution because everything is handed over as var
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
        //planned solution if not everything is handed over as var
        // assert.strictEqual(alProcedure.parameters.length, 0);
        // assert.strictEqual(alProcedure.variables.length, 1);
        // assert.strictEqual(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        // assert.strictEqual(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithOneParameterByReference', async () => {
        let procedureName = 'testProcedureWithOneParameterByReference';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithTwoParametersByReference', async () => {
        let procedureName = 'testProcedureWithTwoParametersByReference';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithMultilineParametersByReference', async () => {
        let procedureName = 'testProcedureWithMultilineParametersByReference';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });

    test('Before_ProcedureWithCodeunitAsParameter', async () => {
        let procedureName = 'testProcedureWithCodeunitAsParameter';
        let textToExtractStart = 'CodeunitToExtract.procedureWithCodeunitAsParameter(CodeunitToExtract);  //extract this line';
        let textToExtractEnd = 'CodeunitToExtract.procedureWithCodeunitAsParameter(CodeunitToExtract);  //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'codeunit codeunittoextract');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'codeunittoextract');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });

    test('Before_ProcedureWithPageAsParameter', async () => {
        let procedureName = 'testProcedureWithPageAsParameter';
        let textToExtractStart = 'MyPage.Run();  //extract this line';
        let textToExtractEnd = 'MyPage.Run();  //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'page mypage');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'mypage');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });

    test('Before_ProcedureWithAssignmentBefore', async () => {
        let procedureName = 'testProcedureWithAssignmentBefore';
        let textToExtractStart = 'Customer.Insert();  //extract this line';
        let textToExtractEnd = 'Customer.Insert();  //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        //current solution because everything is handed over as var
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        //planned solution if not everything is handed over as var
        // assert.strictEqual(alProcedure.parameters[0].isVar, false);
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithProcedureCallBefore', async () => {
        let procedureName = 'testProcedureWithProcedureCallBefore';
        let textToExtractStart = 'Customer.Name := \'Test\'; //extract from this line';
        let textToExtractEnd = 'Customer.Insert();  //to this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithNotUsedFilteringBefore', async () => {
        let procedureName = 'testProcedureWithNotUsedFilteringBefore';
        let textToExtractStart = 'Customer.Name := \'Test\'; //extract from this line';
        let textToExtractEnd = 'Customer.Insert();  //to this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getExpressionStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        //current solution because everything is handed over as var
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
        //planned solution if not everything is handed over as var
        // assert.strictEqual(alProcedure.parameters.length, 0);
        // assert.strictEqual(alProcedure.variables.length, 1);
        // assert.strictEqual(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        // assert.strictEqual(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithUsedFilteringBefore', async () => {
        let procedureName = 'testProcedureWithUsedFilteringBefore';
        let textToExtractStart = '"Customer with Quotes".Name := \'Test\'; //extract from this line';
        let textToExtractEnd = 'isCustomerEmpty := "Customer with Quotes".IsEmpty();  //to this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), '"customer with quotes"');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 1);
        assert.strictEqual(alProcedure.variables[0].type.toLowerCase(), 'boolean');
        assert.strictEqual(alProcedure.variables[0].name.toLowerCase(), 'iscustomerempty');
    });
    test('Before_ProcedureWithUsedValueAfterwards', async () => {
        let procedureName = 'testProcedureWithUsedValueAfterwards';
        let textToExtractStart = 'Customer.Name := \'Test\'; //extract this line';
        let textToExtractEnd = 'Customer.Name := \'Test\'; //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('ProcedureWithUsedReturnValue', async () => {
        let procedureName = 'testProcedureWithUsedReturnValue';
        let textToExtractStart = 'myReturnValue := Customer."No."; //extract this line';
        let textToExtractEnd = 'myReturnValue := Customer."No."; //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.parameters.length, 2);
        assert.strictEqual(alProcedure.parameters[0].type.toLowerCase(), 'record customer temporary');
        assert.strictEqual(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.parameters[1].type.toLowerCase(), 'code[20]');
        assert.strictEqual(alProcedure.parameters[1].name.toLowerCase(), 'myreturnvalue');
        assert.strictEqual(alProcedure.parameters[1].isVar, true);
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('PartiallyExtractInListExpression', async () => {
        let procedureName = 'OnRun';
        let textToExtractStart = '1 in [2, 3]';
        let textToExtractEnd = '1 in [2, 3]';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getInListExpression()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getInListExpression()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, 'Boolean');
        assert.strictEqual(alProcedure.returnVariableName, 'returnValue');
        assert.strictEqual(alProcedure.getBody(), 'returnValue := 1 in [2, 3];')
        assert.strictEqual(alProcedure.parameters.length, 0);
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('PartiallyExtractAssignmentStatement', async () => {
        let procedureName = 'OnRun';
        let textToExtractStart = '(addend - 1)';
        let textToExtractEnd = '(addend - 1)';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getParenthesizedExpression()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getParenthesizedExpression()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunitToExtractDocument, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunitToExtractDocument, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, 'Integer');
        assert.strictEqual(alProcedure.returnVariableName, 'returnValue');
        assert.strictEqual(alProcedure.getBody(), 'returnValue := (addend - 1);')
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.parameters[0].name, 'addend');
        assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
        assert.strictEqual(alProcedure.variables.length, 0);
    });
    test('ExtractIfOneliner', async () => {
        let procedureName = 'myProcedure';
        let textToExtractStart = 'intParam := 6';
        let textToExtractEnd = 'intParam := 6';
        let rangeToExtract: vscode.Range = getRange(codeunit1Document, procedureName, textToExtractStart, textToExtractEnd);
        let syntaxTreeCodeunit1Doc: SyntaxTree = await SyntaxTree.getInstance(codeunit1Document);
        let startTreeNode: ALFullSyntaxTreeNode = syntaxTreeCodeunit1Doc.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let endTreeNode: ALFullSyntaxTreeNode = syntaxTreeCodeunit1Doc.findTreeNode(rangeToExtract.end, [FullSyntaxTreeNodeKind.getAssignmentStatement()]) as ALFullSyntaxTreeNode;
        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(codeunit1Document, startTreeNode, endTreeNode);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new CodeActionProviderExtractProcedure(codeunit1Document, rangeToExtract).provideProcedureObjectForCodeAction(rangeToExtract, returnTypeAnalyzer);
        assert.notStrictEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.strictEqual(alProcedure.accessModifier, AccessModifier.local);
        assert.strictEqual(alProcedure.returnType, undefined);
        assert.strictEqual(alProcedure.getBody(), 'intParam := 6;')
        assert.strictEqual(alProcedure.parameters.length, 1);
        assert.strictEqual(alProcedure.parameters[0].isVar, true);
        assert.strictEqual(alProcedure.parameters[0].name, 'intParam');
        assert.strictEqual(alProcedure.parameters[0].type, 'Integer');
        assert.strictEqual(alProcedure.variables.length, 0);
    });


    function getRange(document: vscode.TextDocument, procedureName: string, textToExtractStart: string, textToExtractEnd: string): vscode.Range {
        let line: number | undefined;
        let inProcedure: boolean = false;
        let startPos: vscode.Position | undefined;
        let endPos: vscode.Position | undefined;
        for (let i = 0; i < document.lineCount; i++) {
            if (document.lineAt(i).text.includes('procedure ' + procedureName + '(') || document.lineAt(i).text.includes('trigger ' + procedureName + '(')) {
                inProcedure = true;
            }
            if (inProcedure) {
                let textOfLine: string = document.lineAt(i).text;
                if (textOfLine.includes(textToExtractStart)) {
                    startPos = new vscode.Position(i, document.lineAt(i).text.indexOf(textToExtractStart));
                }
                if (startPos) {
                    if (document.lineAt(i).text.includes(textToExtractEnd)) {
                        endPos = new vscode.Position(i, document.lineAt(i).text.indexOf(textToExtractEnd) + textToExtractEnd.length);
                        return new vscode.Range(startPos, endPos);
                    }
                }
            }
        }
        throw new Error('line should be found.');
    }
});