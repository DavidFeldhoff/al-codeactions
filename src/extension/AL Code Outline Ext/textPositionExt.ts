import * as vscode from 'vscode';
export class TextPositionExt {
    public static compareVsPosition(textPosition: any, vsPosition: vscode.Position): number {
        if (vsPosition.line === textPosition.line) {
            return (textPosition.character - vsPosition.character);
        } else {
            return (textPosition.line - vsPosition.line);
        }
    }
}