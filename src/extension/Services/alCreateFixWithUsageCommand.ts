import { DiagnosticAnalzyer } from './../Utils/diagnosticAnalyzer';
import * as vscode from 'vscode';

export class ALCreateFixWithUsageCommand {
    public static urisToChange: vscode.Uri[] = [];
    public static async fixWithUsages() {
        //clear all uris to change
        this.urisToChange = [];

        let allDiagnosticsOfWith: [vscode.Uri, vscode.Diagnostic[]][] = new DiagnosticAnalzyer().getAllDiagnosticsOfExplicitWith();
        if (allDiagnosticsOfWith.length === 0) {
            vscode.window.showInformationMessage('No warnings of type AL0606 and AL0604 found.');
            return;
        }
        let dirtyFilesExist: boolean = false;
        for (let i = 0; i < allDiagnosticsOfWith.length; i++) {
            let currentUri: vscode.Uri = allDiagnosticsOfWith[i][0];
            let diagnosticsOfUri: vscode.Diagnostic[] = allDiagnosticsOfWith[i][1];

            for (let a = 0; a < diagnosticsOfUri.length; a++) {
                let currentDoc: vscode.TextDocument | undefined = vscode.workspace.textDocuments.find(td => td.uri === currentUri);
                if (!currentDoc) {
                    currentDoc = await vscode.workspace.openTextDocument(currentUri);
                }
                let codeActions: vscode.CodeAction[] | undefined = await vscode.commands.executeCommand('vscode.executeCodeActionProvider', currentUri, diagnosticsOfUri[a].range);
                if (codeActions) {
                    let codeActionToExecute: vscode.CodeAction | undefined = codeActions.find(c => c.title === "Convert the 'with' statement to fully qualified statements." || c.title === "Qualify with 'Rec' -> All occurrences in this object.");
                    if (codeActionToExecute && codeActionToExecute.command && codeActionToExecute.command.arguments) {
                        if (currentDoc.isDirty) {
                            dirtyFilesExist = true;
                        } else {
                            this.urisToChange.push(currentDoc.uri);
                            vscode.commands.executeCommand(codeActionToExecute.command.command, codeActionToExecute.command.arguments[0]);
                        }
                        break;
                    }
                }
            }
        }
        if (dirtyFilesExist) {
            vscode.window.showWarningMessage('A few files had unsaved changes. These were not updated.');
        }
    }
    static onAfterCodeActionExecuted(e: vscode.TextDocumentChangeEvent) {
        if (this.urisToChange.includes(e.document.uri)) {
            e.document.save();
            ALCreateFixWithUsageCommand.urisToChange = ALCreateFixWithUsageCommand.urisToChange.filter(uri => uri !== e.document.uri);
        }
    }
}