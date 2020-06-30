import { WithDocumentAL0604Fixer } from './../FixWithUsage/WithDocumentAL0604Fixer';
import { DiagnosticAnalzyer } from './../Utils/diagnosticAnalyzer';
import * as vscode from 'vscode';
import { WithDocumentAL0606Fixer } from '../FixWithUsage/WithDocumentAL0606Fixer';
import { WithDocumentFixer } from '../FixWithUsage/WithDocumentFixer';

export class ALCreateFixWithUsageCommand {
    public static async fixWithUsages() {
        let AL0604WarningsAtStart: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tupel => tupel[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0604'));
        let AL0606WarningsAtStart: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tupel => tupel[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0606'));        

        await this.fixImplicitWithUsages();
        await this.fixExplicitWithUsages();

        ALCreateFixWithUsageCommand.createFinishMessage(AL0604WarningsAtStart, AL0606WarningsAtStart);
    }
    
    private static createFinishMessage(allDocumentsWithDiagnosticOfAL0604: [vscode.Uri, vscode.Diagnostic[]][], allDocumentsWithDiagnosticOfAL0606: [vscode.Uri, vscode.Diagnostic[]][]) {
        let finishMsg: string = "Finished!";
        if (allDocumentsWithDiagnosticOfAL0604.length > 0) {
            finishMsg += " Implicit with fixed: " + allDocumentsWithDiagnosticOfAL0604.length + ".";
        }
        if (allDocumentsWithDiagnosticOfAL0606.length > 0) {
            finishMsg += " Explicit with fixed: " + allDocumentsWithDiagnosticOfAL0606.length + ".";
        }
        if (allDocumentsWithDiagnosticOfAL0606.length > 0 || allDocumentsWithDiagnosticOfAL0604.length > 0) {
            vscode.window.showInformationMessage(finishMsg);
        }
    }

    static async fixImplicitWithUsages() {
        let allDocumentsWithDiagnosticOfAL0604: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tupel => tupel[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0604'));
        if (allDocumentsWithDiagnosticOfAL0604.length === 0) {
            vscode.window.showInformationMessage('No warnings of type AL0604 found.');
            return;
        }
        let withDocumentAL0604Fixer: WithDocumentAL0604Fixer = new WithDocumentAL0604Fixer();
        ALCreateFixWithUsageCommand.openDocuments(allDocumentsWithDiagnosticOfAL0604, withDocumentAL0604Fixer);
        await withDocumentAL0604Fixer.fixWithUsagesOfAllDocuments();
    }

    static async fixExplicitWithUsages() {
        let allDocumentsWithDiagnosticOfAL0606: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tupel => tupel[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0606'));
        if (allDocumentsWithDiagnosticOfAL0606.length === 0) {
            vscode.window.showInformationMessage('No warnings of type AL0606 found.');
            return;
        }
        let withDocumentAL0606Fixer: WithDocumentAL0606Fixer = new WithDocumentAL0606Fixer();
        ALCreateFixWithUsageCommand.openDocuments(allDocumentsWithDiagnosticOfAL0606, withDocumentAL0606Fixer);
        await withDocumentAL0606Fixer.fixWithUsagesOfAllDocuments();
    }
    
    private static openDocuments(allDocumentsWithSpecifiedDiagnostics: [vscode.Uri, vscode.Diagnostic[]][], withDocumentFixer: WithDocumentFixer) {
        for (let i = 0; i < allDocumentsWithSpecifiedDiagnostics.length; i++) {
            withDocumentFixer.addDocument(allDocumentsWithSpecifiedDiagnostics[i][0]);
        }
    }
}