import { Range } from 'vscode';
import { TextPositionExt } from './textPositionExt';

export class TextRangeExt {
    public static createVSCodeRange(textRange: any): Range {
        let vscodeRange: Range = new Range(textRange.start.line, textRange.start.character, textRange.end.line, textRange.end.character);
        return vscodeRange;
    }
    public static insideVsRange(textRange: any, vsRange: Range): boolean {
        if (!textRange.start || !textRange.end) {
            return false;
        }
        return ((TextPositionExt.compareVsPosition(textRange.start, vsRange.start) <= 0) &&
            (TextPositionExt.compareVsPosition(textRange.end, vsRange.end) >= 0));
    }
}