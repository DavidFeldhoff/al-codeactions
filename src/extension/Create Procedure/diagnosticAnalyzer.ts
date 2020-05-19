import * as vscode from 'vscode';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { isUndefined } from 'util';

export class DiagnosticAnalzyer {
    public constructor() {

    }
    public getValidDiagnosticOfCurrentPosition(document: vscode.TextDocument, range: vscode.Range) {
        let diagnostics = vscode.languages.getDiagnostics(document.uri).filter(d => {
            let isAL = this.checkDiagnosticsLanguage(d);
            let samePos = this.checkDiagnosticsPosition(d, range);
            let validCode: boolean = this.checkDiagnosticsCode(d);
            return isAL && samePos && validCode;
        });

        return diagnostics.length === 1 ? diagnostics[0] : undefined;
    }
    private checkDiagnosticsLanguage(d: vscode.Diagnostic): boolean {
        if (isUndefined(d.source)) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
    }
    private checkDiagnosticsCode(d: vscode.Diagnostic): boolean {
        if (isUndefined(d.code)) {
            return false;
        }
        let supportedDiagnosticCodes: string[] = [];
        for (var enumMember in SupportedDiagnosticCodes) {
            supportedDiagnosticCodes.push(enumMember.toString());
        }
        return supportedDiagnosticCodes.includes(d.code.toString());
    }

    private checkDiagnosticsPosition(d: vscode.Diagnostic, range: vscode.Range): boolean {
        return d.range.contains(range);
    }
}