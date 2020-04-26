
import * as vscode from 'vscode';
import { TextPosition } from "./textPosition";

export class TextRange {
    start: TextPosition | undefined;
    end: TextPosition | undefined;
    isEmpty: boolean;
    isSingleLine: boolean;

    constructor() {
        this.isEmpty = true;
        this.isSingleLine = true;
    }

    static fromAny(source: any): TextRange {
        let val = new TextRange();
        if (source.start)
            val.start = TextPosition.fromAny(source.start);
        if (source.end)
            val.end = TextPosition.fromAny(source.end);
        if (source.isEmpty)
            val.isEmpty = true;
        if (source.isSingleLine)
            val.isSingleLine = true;
        return val;
    }

    public intersectVsRange(range: vscode.Range): boolean {
        if (!this.start || !this.end) {
            return false;
        }
        return ((this.start.compareVsPosition(range.end) <= 0) &&
            (this.end.compareVsPosition(range.start) >= 0));
    }

    public equalsVsRange(range: vscode.Range): boolean {
        if (!this.start || !this.end) {
            return false;
        }
        return ((this.start.character === range.start.character) && (this.start.line === range.start.line) &&
            (this.end.character === range.end.character) && (this.end.line === range.end.line));
    }

    public insideVsRange(range: vscode.Range): boolean {
        if (!this.start || !this.end) {
            return false;
        }
        return ((this.start.compareVsPosition(range.start) <= 0) &&
            (this.end.compareVsPosition(range.end) >= 0));
    }
    public createVSCodeRange(): vscode.Range | undefined {
        if (!this.start || !this.end) {
            return undefined;
        }
        return new vscode.Range(this.start.line, this.start.character, this.end.line, this.end.character);
    }
}