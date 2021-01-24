import * as assert from 'assert';
import * as path from 'path';
import { TextDocument, Range, workspace, window, CodeAction, WorkspaceEdit, TextEdit, Uri } from 'vscode';
import { CodeActionProviderLocalVariableToGlobal } from '../../extension/Services/CodeActionProviderLocalVariableToGlobal';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

suite('ALMoveLocalVarToGlobal Test Suite', function () {
    let codeunitDocument: TextDocument;

    this.timeout(0);
    this.beforeAll('beforeTests', async function () {
        this.timeout(0);
        await ALLanguageExtension.getInstance().activate();

        //open the file just once
        let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
        await workspace.openTextDocument(fileName).then(doc => {
            codeunitDocument = doc;
        });

        window.showInformationMessage('Start all tests of ALMoveLocalVarToGlobal.');
    });

    test('Move variable of variableDeclarationNode', async () => {
        let lineTextToSearch = 'myInt: Integer;';
        let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
        let lineTextToSearchGlobal = 'myInteger: Integer;';
        let rangeOfLineGlobal = getRangeOfLine(codeunitDocument, lineTextToSearchGlobal);

        let codeActionProvider: CodeActionProviderLocalVariableToGlobal = new CodeActionProviderLocalVariableToGlobal(codeunitDocument, rangeOfLine);
        let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
        assert.strictEqual(codeActions.length, 1);
        assert.notStrictEqual(codeActions[0].edit, undefined)
        let edit: WorkspaceEdit = codeActions[0].edit!;
        assert.strictEqual(edit.entries().length, 1)
        let editEntries = edit.entries()[0]
        let uri: Uri = editEntries[0];
        assert.strictEqual(uri, codeunitDocument.uri)
        let textEdits: TextEdit[] = editEntries[1];
        assert.strictEqual(textEdits.length, 2)
        assert.strictEqual(textEdits[0].range.isEqual(new Range(rangeOfLine.start.line, 0, rangeOfLine.start.line + 1, 0)), true)
        assert.strictEqual(textEdits[0].newText, '')
        assert.strictEqual(textEdits[1].range.isEqual(new Range(rangeOfLineGlobal.start.line + 1, 0, rangeOfLineGlobal.start.line + 1, 0)), true)
        assert.strictEqual(textEdits[1].newText, ''.padStart(8, ' ') + 'myInt: Integer;\r\n')
    });
    test('Move last variable of variableDeclarationList with MemberAttribute', async () => {
        let lineTextToSearch = 'myDecimal1, myDecimal2 : Decimal;';
        let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
        let rangeForProvider: Range = rangeOfLine.with(rangeOfLine.start.translate(undefined, 'myDecimal1, '.length))
        let lineTextToSearchGlobal = 'LastVariable: Codeunit EmptyCodeunit;';
        let rangeOfLineGlobal = getRangeOfLine(codeunitDocument, lineTextToSearchGlobal);

        let codeActionProvider: CodeActionProviderLocalVariableToGlobal = new CodeActionProviderLocalVariableToGlobal(codeunitDocument, rangeForProvider);
        let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
        assert.strictEqual(codeActions.length, 1);
        assert.notStrictEqual(codeActions[0].edit, undefined)
        let edit: WorkspaceEdit = codeActions[0].edit!;
        assert.strictEqual(edit.entries().length, 1)
        let editEntries = edit.entries()[0]
        let uri: Uri = editEntries[0];
        assert.strictEqual(uri, codeunitDocument.uri)
        let textEdits: TextEdit[] = editEntries[1];
        assert.strictEqual(textEdits.length, 2)
        assert.strictEqual(textEdits[0].range.isEqual(new Range(
            rangeOfLine.start.line,
            rangeOfLine.start.character + 'myDecimal1'.length,
            rangeOfLine.start.line,
            rangeOfLine.start.character + 'myDecimal1, myDecimal2'.length)), true)
        assert.strictEqual(textEdits[0].newText, '')
        assert.strictEqual(textEdits[1].range.isEqual(new Range(rangeOfLineGlobal.start.line + 1, 0, rangeOfLineGlobal.start.line + 1, 0)), true)
        let indent: string = ''.padStart(8, ' ');
        assert.strictEqual(textEdits[1].newText, indent + '[InDataSet]\r\n' + indent + 'myDecimal2: Decimal;\r\n')
    });
    test('Move first variable of variableDeclarationList with MemberAttribute', async () => {
        let lineTextToSearch = 'myDecimal1, myDecimal2 : Decimal;';
        let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
        let lineTextToSearchGlobal = 'LastVariable: Codeunit EmptyCodeunit;';
        let rangeOfLineGlobal = getRangeOfLine(codeunitDocument, lineTextToSearchGlobal);

        let codeActionProvider: CodeActionProviderLocalVariableToGlobal = new CodeActionProviderLocalVariableToGlobal(codeunitDocument, rangeOfLine);
        let codeActions: CodeAction[] = await codeActionProvider.createCodeActions();
        assert.strictEqual(codeActions.length, 1);
        assert.notStrictEqual(codeActions[0].edit, undefined)
        let edit: WorkspaceEdit = codeActions[0].edit!;
        assert.strictEqual(edit.entries().length, 1)
        let editEntries = edit.entries()[0]
        let uri: Uri = editEntries[0];
        assert.strictEqual(uri, codeunitDocument.uri)
        let textEdits: TextEdit[] = editEntries[1];
        assert.strictEqual(textEdits.length, 2)
        assert.strictEqual(textEdits[0].range.isEqual(new Range(
            rangeOfLine.start.line,
            rangeOfLine.start.character,
            rangeOfLine.start.line,
            rangeOfLine.start.character + 'myDecimal1, '.length)), true)
        assert.strictEqual(textEdits[0].newText, '')
        assert.strictEqual(textEdits[1].range.isEqual(new Range(rangeOfLineGlobal.start.line + 1, 0, rangeOfLineGlobal.start.line + 1, 0)), true)
        let indent: string = ''.padStart(8, ' ');
        assert.strictEqual(textEdits[1].newText, indent + '[InDataSet]\r\n' + indent + 'myDecimal1: Decimal;\r\n')
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