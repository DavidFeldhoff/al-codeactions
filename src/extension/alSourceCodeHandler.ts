import * as vscode from 'vscode';
import { RegExpCreator } from './regexpCreator';
import { isNullOrUndefined, isUndefined, isNull } from 'util';
import { ALObject } from './alObject';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';

export class ALSourceCodeHandler {

    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }
    public getALObjectOfDocument(): ALObject {
        let lineNo: number | undefined = this.getObjectDeclarationLine();
        if (!isUndefined(lineNo)) {
            let lineText = this.document.lineAt(lineNo as number).text;
            let execArray = RegExpCreator.matchObjectDeclarationLine.exec(lineText);
            if (!isNull(execArray) && !isUndefined(execArray.groups)) {
                return new ALObject(
                    execArray.groups['objectName'],
                    execArray.groups['objectType'],
                    execArray.groups['objectId'] as unknown as number,
                    this.document);
            }
        }
        throw new Error('Unable to get object type and name of document ' + this.document.fileName + '.');
    }
    private getObjectDeclarationLine(): number | undefined {
        for (let lineNo = 0; lineNo < this.document.lineCount; lineNo++) {
            let lineText = this.document.lineAt(lineNo).text;
            if (RegExpCreator.matchObjectDeclarationLine.test(lineText)) {
                return lineNo;
            }
        }
        return undefined;
    }

    public async getProcedureOrTriggerNameOfCurrentPosition(currentLine: number): Promise<string> {
        this.document.lineAt(currentLine);
        let alCodeOutlineExtension = await ALCodeOutlineExtension.getInstance();
        let azALDevTools = alCodeOutlineExtension.getAPI();
        let loaded = await azALDevTools.activeDocumentSymbols.loadAsync(false);
        let rootSymbol = azALDevTools.activeDocumentSymbols.rootSymbol;
        if (rootSymbol) {
            let objectSymbol = rootSymbol.findFirstObjectSymbol();
            if (objectSymbol && objectSymbol.childSymbols) {
                for (let i = 0; i < objectSymbol.childSymbols.length; i++) {
                    if (objectSymbol.childSymbols[i].kind === 238) {
                        if (objectSymbol.childSymbols[i].range.start.line <= currentLine && objectSymbol.childSymbols[i].range.end.line >= currentLine) {
                            return objectSymbol.childSymbols[i].name;
                        }
                    }
                }
            }
        } else {
            const regex = RegExpCreator.matchProcedureOrTriggerDeclarationLine;
            for (let i = currentLine; i > 0; i--) {
                let execArray = regex.exec(this.document.lineAt(i).text);
                if (!isNullOrUndefined(execArray)) {
                    return execArray[1];
                }
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
                return new vscode.Position(i, document.lineAt(i).text.trimRight().length);
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
                return new vscode.Position(i, document.lineAt(i).text.trimRight().length);
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

    public getRangeOfProcedureCall(rangeOfProcedureName: vscode.Range): vscode.Range | undefined {
        let lineText = this.document.lineAt(rangeOfProcedureName.start).text;

        let openingBracket = new vscode.Position(rangeOfProcedureName.end.line, rangeOfProcedureName.end.character);
        //TODO: Not yet supported to create a procedure which is part of a call of another (existing) procedure.
        if (lineText.substr(0, openingBracket.character).includes('(')) {
            return undefined;
        }

        let indexOfmatchingClosingBracket = this.findMatchingClosingBracket(this.document, openingBracket);
        if (isUndefined(indexOfmatchingClosingBracket)) {
            return undefined;
        }
        let endOfProcedureCall = indexOfmatchingClosingBracket + 1;
        let lineTextUpToEndOfProcedureCall = lineText.substr(0, endOfProcedureCall);
        let execArray = RegExpCreator.matchWholeProcedureCall.exec(lineTextUpToEndOfProcedureCall);
        if (isNull(execArray)) {
            return;
        } else {
            let beginningOfProcedureCall = endOfProcedureCall - execArray[0].length;

            let procedureCallRange = new vscode.Range(
                rangeOfProcedureName.start.line,
                beginningOfProcedureCall,
                rangeOfProcedureName.end.line,
                endOfProcedureCall);

            return procedureCallRange;
        }
    }
    findMatchingClosingBracket(document: vscode.TextDocument, openingBracket: vscode.Position): number | undefined {
        let lineText = document.lineAt(openingBracket.line).text;
        let lineTextStartingAtBracket = lineText.substr(openingBracket.character);
        let closingBracket;
        let startSearchPos = openingBracket.character;
        let bracketAmountIsEqual = false;
        do {
            closingBracket = lineText.indexOf(')', startSearchPos);
            if (closingBracket === -1) {
                return undefined;
            } else {
                startSearchPos = closingBracket + 1;
            }
            let textBetweenBrackets = lineText.substr(openingBracket.character, closingBracket - openingBracket.character + ")".length);

            let matchOpeningBrackets = textBetweenBrackets.match(/\(/g) as RegExpMatchArray;
            let matchClosingBrackets = textBetweenBrackets.match(/\)/g) as RegExpMatchArray;
            bracketAmountIsEqual = matchOpeningBrackets.length === matchClosingBrackets.length;
        } while (!bracketAmountIsEqual);
        return closingBracket;
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