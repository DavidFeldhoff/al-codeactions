import { Position } from 'vscode';
export class TextPositionExt {
    public static compareVsPosition(textPosition: any, vsPosition: Position): number {
        if (vsPosition.line === textPosition.line) {
            return (textPosition.character - vsPosition.character);
        } else {
            return (textPosition.line - vsPosition.line);
        }
    }
}