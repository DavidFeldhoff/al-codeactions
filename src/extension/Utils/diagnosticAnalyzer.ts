import * as vscode from 'vscode';
import { SupportedDiagnosticCodes } from '../Create Procedure/supportedDiagnosticCodes';
import { isUndefined } from 'util';

export class DiagnosticAnalzyer {
    public constructor() {

    }
    public getValidDiagnosticOfCurrentPositionToCreateProcedure(document: vscode.TextDocument, range: vscode.Range): vscode.Diagnostic[] {
        let diagnostics = vscode.languages.getDiagnostics(document.uri).filter(d => {
            let isAL = this.checkDiagnosticsLanguage(d);
            let samePos = this.checkDiagnosticsPosition(d, range);
            let validCode: boolean = this.checkDiagnosticsCode(d);
            return isAL && samePos && validCode;
        });

        return diagnostics;
    }
    getAllDiagnosticsOfExplicitWith(): [vscode.Uri, vscode.Diagnostic[]][] {
        let allDiagnostics: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics();
        let filteredDiagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [];
        for (let i = 0; i < allDiagnostics.length; i++) {
            let currentUri: vscode.Uri = allDiagnostics[i][0];
            let diagnosticsOfUri: vscode.Diagnostic[] = allDiagnostics[i][1];
            let filteredDiagnosticsOfUri: vscode.Diagnostic[] = diagnosticsOfUri.filter(d => d.code && ['AL0606', 'AL0604'].includes(d.code.toString()));
            if (filteredDiagnosticsOfUri.length > 0) {
                filteredDiagnostics.push([currentUri, filteredDiagnosticsOfUri]);
            }
        }
        return filteredDiagnostics;
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