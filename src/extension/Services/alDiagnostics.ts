import * as vscode from 'vscode';
export class ALDiagnostics {
    public static getDiagnosticsOfFile(editor: vscode.TextEditor | undefined): vscode.Diagnostic[] {
        let diagnostics: vscode.Diagnostic[] = [];
        let regex: RegExp = /^(.*)\b(Page.RunModal\()(.*)/i;
        if (editor === undefined) {
            return diagnostics;
        }
        for (let i = 0; i < editor.document.lineCount; i++) {
            let lineText = editor.document.lineAt(i).text;
            let regexpMatchArr: RegExpMatchArray | null = lineText.match(regex);
            if (regexpMatchArr) {
                let start = new vscode.Position(i, regexpMatchArr[1].length);
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(start, start.translate(0, 'Page.Runmodal'.length)), 'Don\'t use Page.RunModal directly.', vscode.DiagnosticSeverity.Information));
            }
        }
        return diagnostics;
    }
}