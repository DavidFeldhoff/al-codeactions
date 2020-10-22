import * as vscode from 'vscode';
import { CodeActionProviderAL0118 } from './CodeActionProviderAL0118';
import { CodeActionProviderAL0132 } from './CodeActionProviderAL0132';
import { CodeActionProviderAL0499 } from './CodeActionProviderAL0499';
import { ICodeActionProvider } from './ICodeActionProvider';
import { DiagnosticAnalyzer } from '../Utils/diagnosticAnalyzer';
import { SupportedDiagnosticCodes } from '../Create Procedure/supportedDiagnosticCodes';

export class CodeActionProviderCreateProcedureFactory {
    public static getInstances(document: vscode.TextDocument, range: vscode.Range): ICodeActionProvider[] {
        let diagnostics: vscode.Diagnostic[] = new DiagnosticAnalyzer().getValidDiagnosticOfCurrentPositionToCreateProcedure(document, range);
        if (diagnostics.length === 0) {
            return [];
        }
        let codeActionCreators: ICodeActionProvider[] = [];
        diagnostics.forEach(diagnostic => {
            switch (diagnostic.code) {
                case SupportedDiagnosticCodes.AL0118.toString():
                    codeActionCreators.push(new CodeActionProviderAL0118(document, diagnostic));
                    break;
                case SupportedDiagnosticCodes.AL0132.toString():
                    codeActionCreators.push(new CodeActionProviderAL0132(document, diagnostic));
                    break;
                case SupportedDiagnosticCodes.AL0499.toString():
                    codeActionCreators.push(new CodeActionProviderAL0499(document, diagnostic));
                    break;
            }
        });
        return codeActionCreators;
    }
}