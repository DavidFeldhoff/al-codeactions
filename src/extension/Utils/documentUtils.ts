import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { Err } from './Err';

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
        Err._throw('Not yet implemented.');
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
        let eol: string = DocumentUtils.getEolByTextDocument(document);
        return this.trimRange2(document.getText().split(eol), currentRange)
    }
    public static trimRange2(fileLines: string[], currentRange: vscode.Range) {
        let newStart: vscode.Position = currentRange.start;
        let newEnd: vscode.Position = currentRange.end;
        let searchClosingTag: boolean = false;
        for (let i = currentRange.start.line; i <= currentRange.end.line; i++) {
            let startPositionToSearch = i === currentRange.start.line ? currentRange.start.character : 0;
            let textRestOfLine = fileLines[i].substring(startPositionToSearch);
            if (searchClosingTag) {
                if (!textRestOfLine.includes('*/')) { continue; } else {
                    textRestOfLine = textRestOfLine.substring(textRestOfLine.indexOf('*/') + 2);
                    searchClosingTag = false;
                }
            }
            if (textRestOfLine.trimLeft().length > 0) {
                if (textRestOfLine.trimLeft().startsWith('//')) {
                    continue;
                } else if (textRestOfLine.trimLeft().startsWith('/*')) {
                    searchClosingTag = true;
                    i--;
                    continue;
                }
                newStart = new vscode.Position(i, fileLines[i].lastIndexOf(textRestOfLine.trimLeft()));
                break;
            }
        }
        let searchForOpeningTag: Boolean = false;
        for (let i = currentRange.end.line; i >= newStart.line; i--) {
            let endPositionToSearch = i === currentRange.end.line ? currentRange.end.character : fileLines[i].length;
            let startPositionToSearch = i === newStart.line ? newStart.character : 0;
            let textFrom0ToEndPos = fileLines[i].substring(startPositionToSearch, endPositionToSearch);
            if (searchForOpeningTag) {
                if (!textFrom0ToEndPos.includes('/*')) { continue; } else {
                    textFrom0ToEndPos = textFrom0ToEndPos.substring(0, textFrom0ToEndPos.indexOf('/*')).trimLeft();
                }
            }
            if (textFrom0ToEndPos.trimRight().length > 0) {
                if (!textFrom0ToEndPos.startsWith('//') && textFrom0ToEndPos.includes('//')) {
                    textFrom0ToEndPos = textFrom0ToEndPos.substring(0, textFrom0ToEndPos.indexOf('//')).trimRight();
                } else if (textFrom0ToEndPos.trimRight().endsWith('*/')) {
                    searchForOpeningTag = true;
                    i++;
                    continue;
                }
                let amountSpaces = textFrom0ToEndPos.length - textFrom0ToEndPos.trimRight().length;
                newEnd = new vscode.Position(i, endPositionToSearch - amountSpaces);
                break;
            }
        }
        let newRange: vscode.Range = new vscode.Range(newStart, newEnd);
        if (fileLines[newRange.start.line].substr(newRange.start.character).startsWith('//') || fileLines[newRange.start.line].substr(newRange.start.character).startsWith('/*')) {

        }
        return newRange;
    }
    public static trimRange3(fileContent: string, currentRange: vscode.Range) {
        let fileLines = fileContent.split(DocumentUtils.getEolByContent(fileContent))
        return this.trimRange2(fileLines, currentRange)
    }
    public static getSubstringOfFileByRange(fileContent: string, range: vscode.Range): string {
        let eol: string = DocumentUtils.getEolByContent(fileContent)
        let fileLines: string[] = fileContent.split(eol);
        let textOfRange: string = ''
        for (let line = range.start.line; line <= range.end.line; line++) {
            let startCharacter: number = range.start.line == line ? range.start.character : 0
            let endCharacter: number = range.end.line == line ? range.end.character : fileLines[line].length - 1
            if (textOfRange != '')
                textOfRange += eol
            textOfRange += fileLines[line].substring(startCharacter, endCharacter)
        }
        return textOfRange;
    }
    public static getEolByTextDocument(document: vscode.TextDocument): string {
        return document.eol == vscode.EndOfLine.CRLF ? '\r\n' : '\n'
    }
    public static getEolByContent(content: string): string {
        let regexCRLF: RegExp = /\r\n/g
        let countCRLF = regexCRLF.test(content) ? content.match(regexCRLF)!.length : 0
        let regexLF: RegExp = /\r\n/g
        let countLF = regexLF.test(content) ? content.match(regexLF)!.length : 0
        if (countCRLF > countLF / 2)
            return '\r\n'
        else
            return '\n'
    }
    public static getPositionOfFileContent(fileContent: string, index: number | undefined): vscode.Position {
        let textUntilIndex: string = fileContent.substring(0, index)
        let eol: string = DocumentUtils.getEolByContent(fileContent)
        let fileLines: string[] = textUntilIndex.split(eol)
        return new vscode.Position(fileLines.length - 1, fileLines[fileLines.length - 1].length)
    }
    public static getIndexOfFileContent(fileContent: string, position: vscode.Position): number {
        let eol: string = DocumentUtils.getEolByContent(fileContent)
        let fileLines = fileContent.split(eol)
        let index: number = 0;
        for (let i = 0; i < position.line; i++)
            index += fileLines[i].length
        index = index + (position.line * eol.length) + position.character
        return index
    }


    public static getProcedureNameOfDiagnosticMessage(message: string): string {
        let regExpMatch: RegExpMatchArray | null = message.match(/The handler function ([^\s]+) was not found.*/);
        if (!regExpMatch || !regExpMatch[1]) {
            Err._throw('Cannot extract FunctionName of Handler Function');
        }
        return regExpMatch[1];
    }

    static async executeRename(location: vscode.Location): Promise<any> {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.selection = new vscode.Selection(location.range.start, location.range.start);
        }
        vscode.commands.executeCommand('editor.action.rename');
    }
}