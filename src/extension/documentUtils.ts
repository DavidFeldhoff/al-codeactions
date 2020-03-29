import * as vscode from 'vscode';
import { isUndefined } from 'util';

export class DocumentUtils{
    public static getNextWordRange(document: vscode.TextDocument, range: vscode.Range, startPos?: vscode.Position): vscode.Range | undefined {
        if(!startPos){
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
        if(!startCharacter){
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
}