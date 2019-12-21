import * as vscode from 'vscode';
import { RegExpCreator } from './regexpCreator';
import { isNullOrUndefined, isUndefined, isNull } from 'util';
import { KeywordHandler } from './keywordHandler';
import { ALObject } from './alObject';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';

export class ALSourceCodeHandler {

    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }
    public getALObjectOfDocument(): ALObject {
        let firstLine = this.document.lineAt(0).text;
        let execArray = RegExpCreator.matchObjectDeclarationLine.exec(firstLine);
        if (isNull(execArray) || isUndefined(execArray.groups)) {
            throw new Error('Unable to get object type and name of document ' + this.document.fileName + '.');
        }
        return new ALObject(
            execArray.groups['objectName'],
            execArray.groups['objectType'],
            execArray.groups['objectId'] as unknown as number,
            this.document);
    }

    public getProcedureNameOfCurrentPosition(currentLine: number): string {
        this.document.lineAt(currentLine);
        const regex = RegExpCreator.matchProcedureOrTriggerDeclarationLine;
        for (let i = currentLine; i > 0; i--) {
            let execArray = regex.exec(this.document.lineAt(i).text);
            if (!isNullOrUndefined(execArray)) {
                return execArray[1];
            }
        }
        throw new Error("The current procedurename was not found starting at line " + currentLine + " in file " + this.document.fileName + ".");
    }

    public getPositionToInsertProcedure(currentLineNo: number | undefined): vscode.Position {
        let position;
        if (!isUndefined(currentLineNo)) {
            position = this.getNextPositionToInsertProcedureStartingAtLine(this.document, currentLineNo);
        } else {
            position = this.getLastPositionToInsertProcedureStartingAtEndOfDocument(this.document);
        }
        return position;
    }

    private getNextPositionToInsertProcedureStartingAtLine(document: vscode.TextDocument, currentLineNo: number): vscode.Position {
        for (let i = currentLineNo; i < document.lineCount; i++) {
            if (this.isPossiblePositionToInsertProcedure(document.lineAt(i))) {
                return new vscode.Position(i, document.lineAt(i).text.length);
            }
        }
        //if the end of the current procedure wasn't found fall back and take the last possible position to insert the procedure.
        return this.getLastPositionToInsertProcedureStartingAtEndOfDocument(document);
    }

    private getLastPositionToInsertProcedureStartingAtEndOfDocument(document: vscode.TextDocument): vscode.Position {
        let lineOfClosingBracket: number | undefined;
        for (let i = document.lineCount - 1; i > 0; i--) {
            if (document.lineAt(i).text.startsWith('}')) {
                lineOfClosingBracket = i;
            }

            if (this.isPossiblePositionToInsertProcedure(document.lineAt(i))) {
                return new vscode.Position(i, document.lineAt(i).text.length);
            }
        }
        if (isUndefined(lineOfClosingBracket)) {
            throw new Error("Unable to find position to insert procedure in file " + document.fileName + ".");
        } else {
            return new vscode.Position(lineOfClosingBracket, 0);
        }
    }
    private isPossiblePositionToInsertProcedure(textLine: vscode.TextLine): boolean {
        let closingTags = ["end;", "}"];
        if (textLine.firstNonWhitespaceCharacterIndex === 4) {
            let trimmedText = textLine.text.toLowerCase().trim();
            return closingTags.includes(trimmedText);
        }
        return false;
    }

    public getRangeOfProcedureCall(diagnostic: vscode.Diagnostic): vscode.Range | undefined {
        let lineText = this.document.lineAt(diagnostic.range.start).text;

        let endOfProcedureCall = lineText.indexOf(')', diagnostic.range.end.character) + 1;
        let lineTextUpToEndOfProcedureCall = lineText.substr(0, endOfProcedureCall);
        let execArray = RegExpCreator.matchWholeProcedureCall.exec(lineTextUpToEndOfProcedureCall);
        if (isNull(execArray)) {
            return;
        } else {
            let beginningOfProcedureCall = endOfProcedureCall - execArray[0].length;

            let procedureCallRange = new vscode.Range(
                diagnostic.range.start.line,
                beginningOfProcedureCall,
                diagnostic.range.end.line,
                endOfProcedureCall);
            return procedureCallRange;
        }
    }

    public getRelevantDiagnosticOfCurrentPosition(range: vscode.Range) {
        let diagnostics = vscode.languages.getDiagnostics(this.document.uri).filter(d => {
            let isAL = this.checkDiagnosticsLanguage(d);
            let samePos = this.checkDiagnosticsPosition(d, range);
            let validCode: boolean = this.checkDiagnosticsCode(d);
            return isAL && samePos && validCode;
        });

        return diagnostics.length === 1 ? diagnostics[0] : undefined;
    }
    private checkDiagnosticsLanguage(d: vscode.Diagnostic): boolean {
        if (isUndefined(d.source)) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
    }
    private checkDiagnosticsCode(d: vscode.Diagnostic): boolean {
        if (isUndefined(d.code)) {
            return false;
        }
        let supportedDiagnosticCodes: string[] = [];
        for (var enumMember in SupportedDiagnosticCodes) {
            supportedDiagnosticCodes.push(enumMember.toString());
        }
        return supportedDiagnosticCodes.includes(d.code.toString());
    }

    private checkDiagnosticsPosition(d: vscode.Diagnostic, range: vscode.Range): boolean {
        let samePos: boolean;
        let selectionMade = range.start.compareTo(range.end) < 0;
        if (selectionMade) {
            samePos = d.range.start.compareTo(range.start) === 0 && d.range.end.compareTo(range.end) === 0;
        }
        else {
            samePos = d.range.start.compareTo(range.start) <= 0 && d.range.end.compareTo(range.start) >= 0;
        }
        return samePos;
    }
}