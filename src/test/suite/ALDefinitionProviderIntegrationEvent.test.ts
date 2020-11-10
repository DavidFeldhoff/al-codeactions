import * as assert from 'assert';
import * as path from 'path';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { DefinitionProviderIntegrationEvent } from '../../extension/Services/DefinitionProviderIntegrationEvent';
import { ALLanguageExtension } from '../alExtension';
import { ALTestProject } from './ALTestProject';

// import * as myExtension from '../extension';

suite('ALDefinitionProviderIntegrationEvent Test Suite', function () {
    let codeunitDocument: vscode.TextDocument;

    this.timeout(0);
    this.beforeAll('beforeTests', async function () {
        this.timeout(0);
        await ALLanguageExtension.getInstance().activate();

        //open the file just once
        let fileName = path.resolve(ALTestProject.dir, 'codeunit1.al');
        await vscode.workspace.openTextDocument(fileName).then(doc => {
            codeunitDocument = doc;
        });

        vscode.window.showInformationMessage('Start all tests of ALBuiltInFunctionDefinitionProvider.');
    });

    test('GetDefinition of EventSubscriber', async () => {
        let lineTextToSearch = '[EventSubscriber(ObjectType::Codeunit, Codeunit::"CustVendBank-Update", \'OnAfterUpdateCustomer\', \'\', false, false)]';
        let rangeOfLine = getRangeOfLine(codeunitDocument, lineTextToSearch);
        let positionToExecuteDefProvider: vscode.Position = rangeOfLine.start.translate(0, '[EventSubscriber(ObjectType::Codeunit, Codeunit::"CustVendBank-Update", \''.length);
        let cancellationToken: any;
        let location: vscode.Location | undefined = await new DefinitionProviderIntegrationEvent().provideDefinition(codeunitDocument, positionToExecuteDefProvider, cancellationToken)
        assert.notStrictEqual(location, undefined, 'Definition expected');
        location = location as vscode.Location;
        let targetDoc: vscode.TextDocument = await vscode.workspace.openTextDocument(location.uri);
        assert.strictEqual(location.uri.fsPath.includes('CustVendBank-Update.dal'), true);
        assert.strictEqual(targetDoc.getText(location.range), 'OnAfterUpdateCustomer');
    });

    function getRangeOfLine(document: vscode.TextDocument, lineTextToSearch: string, startingAtLine: number = 0): vscode.Range {
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
        return new vscode.Range(line, startPos, line, endPos);
    }
});