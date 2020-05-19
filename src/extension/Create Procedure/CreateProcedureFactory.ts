import * as vscode from 'vscode';
import { DiagnosticAnalzyer } from './diagnosticAnalyzer';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ICodeActionCreator } from './Code Action Creator/ICodeActionCreator';
import { CodeActionCreatorAL0118 } from './Code Action Creator/CodeActionCreatorAL0118';
import { CodeActionCreatorAL0132 } from './Code Action Creator/CodeActionCreatorAL0132';
import { CodeActionCreatorAL0499 } from './Code Action Creator/CodeActionCreatorAL0499';

export class CreateProcedureFactory {
    public static getInstance(document: vscode.TextDocument, range: vscode.Range): ICodeActionCreator | undefined {
        let diagnostic = new DiagnosticAnalzyer().getValidDiagnosticOfCurrentPosition(document, range);
        if (!diagnostic) {
            return;
        }
        switch (diagnostic.code) {
            case SupportedDiagnosticCodes.AL0118.toString():
                return new CodeActionCreatorAL0118(document, diagnostic);
            case SupportedDiagnosticCodes.AL0132.toString():
                return new CodeActionCreatorAL0132(document, diagnostic);
            case SupportedDiagnosticCodes.AL0499.toString():
                return new CodeActionCreatorAL0499(document, diagnostic);
            default:
                return;
        }
    }
}