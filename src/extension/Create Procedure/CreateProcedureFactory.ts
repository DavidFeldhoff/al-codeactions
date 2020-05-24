import * as vscode from 'vscode';
import { DiagnosticAnalzyer } from './diagnosticAnalyzer';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ICodeActionCreator } from './Code Action Creator/ICodeActionCreator';
import { CodeActionCreatorAL0118 } from './Code Action Creator/CodeActionCreatorAL0118';
import { CodeActionCreatorAL0132 } from './Code Action Creator/CodeActionCreatorAL0132';
import { CodeActionCreatorAL0499 } from './Code Action Creator/CodeActionCreatorAL0499';

export class CreateProcedureFactory {
    public static getInstances(document: vscode.TextDocument, range: vscode.Range): ICodeActionCreator[] {
        let diagnostics: vscode.Diagnostic[] = new DiagnosticAnalzyer().getValidDiagnosticOfCurrentPosition(document, range);
        if (diagnostics.length === 0) {
            return [];
        }
        let codeActionCreators: ICodeActionCreator[] = [];
        diagnostics.forEach(diagnostic => {
            switch (diagnostic.code) {
                case SupportedDiagnosticCodes.AL0118.toString():
                    codeActionCreators.push(new CodeActionCreatorAL0118(document, diagnostic));
                    break;
                case SupportedDiagnosticCodes.AL0132.toString():
                    codeActionCreators.push(new CodeActionCreatorAL0132(document, diagnostic));
                    break;
                case SupportedDiagnosticCodes.AL0499.toString():
                    codeActionCreators.push(new CodeActionCreatorAL0499(document, diagnostic));
                    break;
            }
        });
        return codeActionCreators;
    }
}