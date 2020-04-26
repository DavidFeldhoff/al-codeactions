import * as assert from 'assert';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ALTestProject } from './ALTestProject';
import { ALLanguageExtension } from '../alExtension';
import { ALExtractToProcedureCA } from '../../extension/alExtractToProcedureCA';
import { ALProcedure } from '../../extension/alProcedure';
import { ReturnTypeAnalzyer } from '../../extension/Extract Procedure/returnTypeAnalyzer';

suite('ALExtractProcedureCA Test Suite', function () {
    let codeunitToExtractDocument: vscode.TextDocument;
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

        vscode.window.showInformationMessage('Start all tests of ALExtractProcedure.');
    });

    test('Before_ProcedureWithOneParameterByValue', async () => {
        let procedureName = 'testProcedureWithOneParameterByValue';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 0);
        assert.equal(alProcedure.variables.length, 1);
        assert.equal(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithTwoParametersByValue', async () => {
        let procedureName = 'testProcedureWithTwoParametersByValue';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 0);
        assert.equal(alProcedure.variables.length, 1);
        assert.equal(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithMultilineParametersByValue', async () => {
        let procedureName = 'testProcedureWithMultilineParametersByValue';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 0);
        assert.equal(alProcedure.variables.length, 1);
        assert.equal(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithOneParameterByReference', async () => {
        let procedureName = 'testProcedureWithOneParameterByReference';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithTwoParametersByReference', async () => {
        let procedureName = 'testProcedureWithTwoParametersByReference';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithMultilineParametersByReference', async () => {
        let procedureName = 'testProcedureWithMultilineParametersByReference';
        let textToExtractStart = 'Customer.Name := \'Test\';';
        let textToExtractEnd = 'Customer.Insert();';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });

    test('Before_ProcedureWithCodeunitAsParameter', async () => {
        let procedureName = 'testProcedureWithCodeunitAsParameter';
        let textToExtractStart = 'CodeunitToExtract.procedureWithCodeunitAsParameter(CodeunitToExtract);  //extract this line';
        let textToExtractEnd = 'CodeunitToExtract.procedureWithCodeunitAsParameter(CodeunitToExtract);  //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'codeunit codeunittoextract');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'codeunittoextract');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });

    test('Before_ProcedureWithPageAsParameter', async () => {
        let procedureName = 'testProcedureWithPageAsParameter';
        let textToExtractStart = 'MyPage.Run();  //extract this line';
        let textToExtractEnd = 'MyPage.Run();  //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'page mypage');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'mypage');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });

    test('Before_ProcedureWithAssignmentBefore', async () => {
        let procedureName = 'testProcedureWithAssignmentBefore';
        let textToExtractStart = 'Customer.Insert();  //extract this line';
        let textToExtractEnd = 'Customer.Insert();  //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.equal(alProcedure.parameters[0].isVar, false);
        assert.equal(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithProcedureCallBefore', async () => {
        let procedureName = 'testProcedureWithProcedureCallBefore';
        let textToExtractStart = 'Customer.Name := \'Test\'; //extract from this line';
        let textToExtractEnd = 'Customer.Insert();  //to this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });    
    test('Before_ProcedureWithNotUsedFilteringBefore', async () => {
        let procedureName = 'testProcedureWithNotUsedFilteringBefore';
        let textToExtractStart = 'Customer.Name := \'Test\'; //extract from this line';
        let textToExtractEnd = 'Customer.Insert();  //to this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 0);
        assert.equal(alProcedure.variables.length, 1);
        assert.equal(alProcedure.variables[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.variables[0].name.toLowerCase(), 'customer');
    });
    test('Before_ProcedureWithUsedFilteringBefore', async () => {
        let procedureName = 'testProcedureWithUsedFilteringBefore';
        let textToExtractStart = 'Customer.Name := \'Test\'; //extract from this line';
        let textToExtractEnd = 'isCustomerEmpty := Customer.IsEmpty();  //to this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });
    test('Before_ProcedureWithUsedValueAfterwards', async () => {
        let procedureName = 'testProcedureWithUsedValueAfterwards';
        let textToExtractStart = 'Customer.Name := \'Test\'; //extract this line';
        let textToExtractEnd = 'Customer.Name := \'Test\'; //extract this line';
        let rangeToExtract: vscode.Range = getRange(codeunitToExtractDocument, procedureName, textToExtractStart, textToExtractEnd);
        let returnTypeAnalyzer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(codeunitToExtractDocument, rangeToExtract);
        await returnTypeAnalyzer.analyze();
        let alProcedure: ALProcedure | undefined = await new ALExtractToProcedureCA().provideProcedureObjectForCodeAction(codeunitToExtractDocument, rangeToExtract, returnTypeAnalyzer);
        assert.notEqual(alProcedure, undefined, 'Procedure should be extracted');
        alProcedure = alProcedure as ALProcedure;
        assert.equal(alProcedure.isLocal, true);
        assert.equal(alProcedure.returnType, undefined);
        assert.equal(alProcedure.parameters.length, 1);
        assert.equal(alProcedure.parameters[0].type.toLowerCase(), 'record customer');
        assert.equal(alProcedure.parameters[0].name.toLowerCase(), 'customer');
        assert.equal(alProcedure.parameters[0].isVar, true);
        assert.equal(alProcedure.variables.length, 0);
    });


    function getRange(document: vscode.TextDocument, procedureName: string, textToExtractStart: string, textToExtractEnd: string): vscode.Range {
        let line: number | undefined;
        let inProcedure: boolean = false;
        let startPos: vscode.Position | undefined;
        let endPos: vscode.Position | undefined;
        for (let i = 0; i < document.lineCount; i++) {
            if (document.lineAt(i).text.includes('procedure ' + procedureName + '(')) {
                inProcedure = true;
            }
            if (inProcedure) {
                if (document.lineAt(i).text.includes(textToExtractStart)) {
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