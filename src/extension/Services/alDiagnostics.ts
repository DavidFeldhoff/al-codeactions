import * as vscode from 'vscode';
export class ALDiagnostics {
    public static regexPageRun: RegExp = /^(.*)\b(Page.Run(?:Modal)?)\(.*$/i;
    public static getDiagnosticsOfFile(document: vscode.TextDocument): vscode.Diagnostic[] {
        let diagnostics: vscode.Diagnostic[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            let lineText = document.lineAt(i).text;
            let regexpMatchArr: RegExpMatchArray | null = lineText.match(ALDiagnostics.regexPageRun);
            if (regexpMatchArr) {
                let start = new vscode.Position(i, regexpMatchArr[1].length);
                let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(start, start.translate(0, regexpMatchArr[2].length)), "Don't use " + regexpMatchArr[2] + " directly.", vscode.DiagnosticSeverity.Information);
                diagnostic.code = 'ALCodeActions001';
                diagnostics.push(diagnostic);
            }
        }
        return diagnostics;
    }
}