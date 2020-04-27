import * as vscode from 'vscode';
import { isUndefined } from 'util';

export class DocumentUtils {
    static isPositionInProcedurecall(document: vscode.TextDocument, rangeToSearchIn: vscode.Range, positionToCheck: vscode.Position): boolean {
        let inQuotes: boolean;
        let inText: boolean;
        let bracketDepth: number = 0;
        for (let lineNo = rangeToSearchIn.start.line; lineNo <= rangeToSearchIn.end.line; lineNo++) {
            let lineText = document.lineAt(lineNo).text;
            let lineChars: string[] = lineText.split('');
            inQuotes = false;
            inText = false;
            let charNo = lineNo === rangeToSearchIn.start.line ? rangeToSearchIn.start.character : 0;
            let endCharOfLine = lineNo === rangeToSearchIn.end.line ? rangeToSearchIn.end.character : lineText.length - 1;
            for (; charNo <= endCharOfLine; charNo++) {
                if (positionToCheck.isEqual(new vscode.Position(lineNo, charNo))) {
                    return bracketDepth <= 0;
                } else {
                    if (lineChars[charNo] === '\'') {
                        let escaped = inText && lineChars.length > charNo + 1 && lineChars[charNo + 1] === '\'';
                        if (!escaped) {
                            inText = !inText;
                        } else {
                            charNo++;
                        }
                    }
                    if (!inText) {
                        if (lineChars[charNo] === '"') {
                            inQuotes = !inQuotes;
                        }
                        if (!inQuotes) {
                            if (lineChars[charNo] === '(') {
                                bracketDepth++;
                            } else if (lineChars[charNo] === ')') {
                                bracketDepth--;
                            } else if (lineChars[charNo] === '/' && charNo > 0 && lineChars[charNo - 1] === '/') {
                                break;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
    static getPreviousValidPositionOfCharacter(document: vscode.TextDocument, rangeToSearchIn: vscode.Range, positionToStart: vscode.Position, characterToSearch: string): vscode.Position {
        throw new Error('Not yet implemented.');
    }
    static isPositionInQuotes(document: vscode.TextDocument, rangeToSearchIn: vscode.Range, positionToCheck: vscode.Position): boolean {
        let inQuotes: boolean;
        for (let lineNo = rangeToSearchIn.start.line; lineNo <= rangeToSearchIn.end.line; lineNo++) {
            let lineText = document.lineAt(lineNo).text;
            let lineChars: string[] = lineText.split('');
            inQuotes = false;
            let charNo = lineNo === rangeToSearchIn.start.line ? rangeToSearchIn.start.character : 0;
            let endCharOfLine = lineNo === rangeToSearchIn.end.line ? rangeToSearchIn.end.character : lineText.length - 1;
            for (; charNo <= endCharOfLine; charNo++) {
                if (positionToCheck.isEqual(new vscode.Position(lineNo, charNo))) {
                    return inQuotes;
                } else {
                    if (lineChars[charNo] === '"') {
                        inQuotes = !inQuotes;
                    }
                }
            }
        }
        return false;
    }
    public static getNextWordRangeInsideLine(document: vscode.TextDocument, range: vscode.Range, startPos?: vscode.Position): vscode.Range | undefined {
        if (!startPos) {
            startPos = range.start;
        }
        let inQuotes: boolean = false;
        let lineChars: string[] = document.lineAt(range.start.line).text.split('');
        let word: string = '';
        let wordStart: number | undefined;
        for (let i = startPos.character; i <= range.end.character; i++) {
            if (isUndefined(wordStart)) {
                if (lineChars[i] === '"' || lineChars[i].match(/\w/)) {
                    wordStart = i;
                    inQuotes = lineChars[i] === '"';
                    word += lineChars[i];
                }
            } else {
                if (inQuotes) {
                    word += lineChars[i];
                    if (lineChars[i] === '"') {
                        return new vscode.Range(startPos.line, Number(wordStart), startPos.line, Number(wordStart) + word.length);
                    }
                } else {
                    if (!lineChars[i].match(/\w/)) {
                        return new vscode.Range(startPos.line, Number(wordStart), startPos.line, Number(wordStart) + word.length);
                    }
                    word += lineChars[i];
                }
            }
        }
    }
    public static getNextWord(text: string, startCharacter?: number): string | undefined {
        if (!startCharacter) {
            startCharacter = 0;
        }
        let inQuotes: boolean = false;
        let word: string = '';
        let wordStart: number | undefined;
        for (let i = startCharacter; i <= text.length; i++) {
            if (isUndefined(wordStart)) {
                if (text.charAt(i) === '"' || text.charAt(i).match(/\w/)) {
                    wordStart = i;
                    inQuotes = text.charAt(i) === '"';
                    word += text.charAt(i);
                }
            } else {
                if (inQuotes) {
                    word += text.charAt(i);
                    if (text.charAt(i) === '"') {
                        return word;
                    }
                } else {
                    if (!text.charAt(i).match(/\w/)) {
                        return word;
                    }
                    word += text.charAt(i);
                }
            }
        }
    }
    public static getPreviousWordRange(document: vscode.TextDocument, startPos: vscode.Position): vscode.Range | undefined {
        let inQuotes: boolean = false;
        let lineChars: string[] = document.lineAt(startPos.line).text.split('');
        let word: string = '';
        let wordEnd: number | undefined;
        for (let i = startPos.character - 1; i >= 0; i--) {
            let char = lineChars[i];
            if (isUndefined(wordEnd)) {
                if (char === '"' || char.match(/\w/)) {
                    wordEnd = i;
                    inQuotes = char === '"';
                    word = char + word;
                } else if (char !== ' ') {
                    return undefined;
                }
            } else {
                if (inQuotes) {
                    word = char + word;
                    if (char === '"') {
                        return new vscode.Range(startPos.line, i, startPos.line, Number(wordEnd));
                    }
                } else {
                    if (!char.match(/\w/)) {
                        return new vscode.Range(startPos.line, i + 1, startPos.line, Number(wordEnd));
                    }
                    word = char + word;
                }
            }
        }
    }
    public static findMatchingClosingBracket(document: vscode.TextDocument, positionBeforeOpeningBracket: vscode.Position): vscode.Position | undefined {
        let lineText = document.lineAt(positionBeforeOpeningBracket.line).text;
        let chars: string[] = lineText.split('');
        let inQuotes: boolean = false;
        let bracketDepth: number = 0;
        for (let i = positionBeforeOpeningBracket.character; i < chars.length; i++) {
            let char = chars[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes) {
                if (char === '(') {
                    bracketDepth += 1;
                } else if (char === ')') {
                    bracketDepth -= 1;
                    if (bracketDepth === 0) {
                        return new vscode.Position(positionBeforeOpeningBracket.line, i);
                    }
                }
            }
        }
        return;
    }
    public static trimRange(document: vscode.TextDocument, currentRange: vscode.Range): vscode.Range {
        let newStart: vscode.Position = currentRange.start;
        let newEnd: vscode.Position = currentRange.end;
        for (let i = currentRange.start.line; i <= currentRange.end.line; i++) {
            let startPositionToSearch = i === currentRange.start.line ? currentRange.start.character : 0;
            let textStartingAtPosition = document.lineAt(i).text.substr(startPositionToSearch);
            if (textStartingAtPosition.trimLeft().length > 0) {
                let amountSpaces = textStartingAtPosition.length - textStartingAtPosition.trimLeft().length;
                newStart = new vscode.Position(i, startPositionToSearch + amountSpaces);
                break;
            }
        }
        for (let i = currentRange.end.line; i >= currentRange.start.line; i--) {
            let endPositionToSearch = i === currentRange.end.line ? currentRange.end.character : document.lineAt(i).text.length - 1;
            let textStartingAtPosition = document.lineAt(i).text.substr(0, endPositionToSearch);
            if (textStartingAtPosition.trimRight().length > 0) {
                let amountSpaces = textStartingAtPosition.length - textStartingAtPosition.trimRight().length;
                newEnd = new vscode.Position(i, endPositionToSearch - amountSpaces);
                break;
            }
        }
        return new vscode.Range(newStart, newEnd);
    }
}