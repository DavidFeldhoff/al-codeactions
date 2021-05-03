import { SupportedDiagnosticCodes } from '../Create Procedure/supportedDiagnosticCodes';
import { TextDocument, Range, Diagnostic, languages, Uri } from 'vscode';

export class DiagnosticAnalyzer {
    public constructor() {

    }
    public getValidDiagnosticOfCurrentPositionToCreateProcedure(document: TextDocument, range: Range): Diagnostic[] {
        let diagnostics = languages.getDiagnostics(document.uri).filter(d => {
            let isAL = this.checkDiagnosticsLanguage(d);
            let samePos = this.checkDiagnosticsPosition(d, range);
            let validCode: boolean = this.checkDiagnosticsCode(d);
            return isAL && samePos && validCode;
        });

        return diagnostics;
    }
    getAllDiagnosticsOfExplicitWith(): [Uri, Diagnostic[]][] {
        let allDiagnostics: [Uri, Diagnostic[]][] = languages.getDiagnostics();
        let filteredDiagnostics: [Uri, Diagnostic[]][] = [];
        for (let i = 0; i < allDiagnostics.length; i++) {
            let currentUri: Uri = allDiagnostics[i][0];
            let diagnosticsOfUri: Diagnostic[] = allDiagnostics[i][1];
            let filteredDiagnosticsOfUri: Diagnostic[] = diagnosticsOfUri.filter(d => d.code && ['AL0606', 'AL0604'].includes(d.code.toString()));
            if (filteredDiagnosticsOfUri.length > 0) {
                filteredDiagnostics.push([currentUri, filteredDiagnosticsOfUri]);
            }
        }
        return filteredDiagnostics;
    }
    private checkDiagnosticsLanguage(d: Diagnostic): boolean {
        if (!d.source) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
    }
    private checkDiagnosticsCode(d: Diagnostic): boolean {
        if (!d.code) {
            return false;
        }
        let supportedDiagnosticCodes: string[] = [];
        for (var enumMember in SupportedDiagnosticCodes) {
            supportedDiagnosticCodes.push(enumMember.toString());
        }
        return supportedDiagnosticCodes.includes(d.code.toString());
    }

    private checkDiagnosticsPosition(d: Diagnostic, range: Range): boolean {
        return d.range.contains(range);
    }
}