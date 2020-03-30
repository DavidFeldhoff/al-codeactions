import * as vscode from 'vscode';
import { RegExpCreator } from './regexpCreator';
import { isUndefined, isNull } from 'util';
import { ALObject } from './alObject';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { DocumentUtils } from './documentUtils';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';

export class ALSourceCodeHandler {

    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }
    public async getPositionToInsertProcedure(currentLineNo: number | undefined): Promise<vscode.Position> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let symbolsLibrary = await azalDevTools.symbolsService.loadDocumentSymbols(this.document.uri);
        let objectSymbol = symbolsLibrary.rootSymbol.findFirstObjectSymbol();

        let position;
        if (!isUndefined(currentLineNo)) {
            position = await this.getNextPositionToInsertProcedureStartingAtLine(this.document, currentLineNo, objectSymbol);
        } else {
            position = this.getLastPositionToInsertProcedureStartingAtEndOfDocument(this.document, objectSymbol);
        }
        return position;
    }

    private async getNextPositionToInsertProcedureStartingAtLine(document: vscode.TextDocument, currentLineNo: number, objectSymbol: any): Promise<vscode.Position> {
        if (objectSymbol.childSymbols) {
            for (let i = 0; i < objectSymbol.childSymbols.length; i++) {
                if (objectSymbol.childSymbols[i].range.start.line <= currentLineNo && objectSymbol.childSymbols[i].range.end.line >= currentLineNo) {
                    if (!ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(objectSymbol.childSymbols[i].kind)) {
                        return this.getLastPositionToInsertProcedureStartingAtEndOfDocument(document, objectSymbol);
                    }
                }
            }
        }

        for (let i = currentLineNo; i < document.lineCount; i++) {
            if (this.isPossiblePositionToInsertProcedure(document, i)) {
                return new vscode.Position(i, document.lineAt(i).text.trimRight().length);
            }
        }
        //if the end of the current procedure wasn't found fall back and take the last possible position to insert the procedure.
        return this.getLastPositionToInsertProcedureStartingAtEndOfDocument(document, objectSymbol);
    }

    private getLastPositionToInsertProcedureStartingAtEndOfDocument(document: vscode.TextDocument, objectSymbol: any): vscode.Position {
        let globalVarSection: any[] = [];
        objectSymbol.collectChildSymbols(428, globalVarSection);
        let endLineNoOfGlobalVars: number | undefined;
        if (globalVarSection.length > 0) {
            endLineNoOfGlobalVars = globalVarSection[0].range.end.line;
        }
        let lineOfClosingBracket: number | undefined;
        for (let i = document.lineCount - 1; i > 0; i--) {
            if (document.lineAt(i).text.startsWith('}')) {
                lineOfClosingBracket = i;
            }

            if (this.isPossiblePositionToInsertProcedure(document, i) || (endLineNoOfGlobalVars && i === endLineNoOfGlobalVars - 1)) {
                return new vscode.Position(i, document.lineAt(i).text.trimRight().length);
            }
        }
        if (isUndefined(lineOfClosingBracket)) {
            throw new Error("Unable to find position to insert procedure in file " + document.fileName + ".");
        } else {
            return new vscode.Position(lineOfClosingBracket, 0);
        }
    }
    private isPossiblePositionToInsertProcedure(document: vscode.TextDocument, lineNo: number): boolean {
        let closingTags = ["end;", "}"];
        let textLine = document.lineAt(lineNo);
        if (textLine.firstNonWhitespaceCharacterIndex === 4) {
            let trimmedText = textLine.text.toLowerCase().trim();
            return closingTags.includes(trimmedText);
        }
        return false;
    }

    public expandRangeToRangeOfProcedureCall(rangeOfProcedureName: vscode.Range): vscode.Range | undefined {
        let lineText = this.document.lineAt(rangeOfProcedureName.start).text;

        let positionBeforeOpeningBracket = new vscode.Position(rangeOfProcedureName.end.line, rangeOfProcedureName.end.character);
        //TODO: Procedure as parameter: Not yet supported
        if (lineText.substr(0, positionBeforeOpeningBracket.character).includes('(')) {
            return undefined;
        }

        // expand procedureRange to the right side
        let indexOfmatchingClosingBracket: vscode.Position | undefined = DocumentUtils.findMatchingClosingBracket(this.document, positionBeforeOpeningBracket);
        if (isUndefined(indexOfmatchingClosingBracket)) {
            return undefined;
        }
        let endOfProcedureCall: vscode.Position = indexOfmatchingClosingBracket.translate(0, 1);

        // expand procedureRange to the left side
        let beginningOfProcedureCall = rangeOfProcedureName.start;
        let chars = lineText.split('');
        for (let i = rangeOfProcedureName.start.character - 1; i >= 0; i--) {
            let char = chars[i];
            if (char === '.') {
                let startOfCalledObject: vscode.Position | undefined = this.expandToCalledObject(this.document, beginningOfProcedureCall.with(undefined, i));
                if (!startOfCalledObject) {
                    throw new Error('Could not find called object.');
                }
                i = startOfCalledObject.character;
                beginningOfProcedureCall = startOfCalledObject.with(undefined, i);
            }
            if (char === '=') {
                if (chars[i - 1] === ':') {
                    let startOfCalledObject: vscode.Position | undefined = this.expandToFieldOrProcedureAndObject(this.document, beginningOfProcedureCall.with(undefined, i - 1));
                    if (!startOfCalledObject) {
                        throw new Error('Could not find called object.');
                    }
                    i = startOfCalledObject.character;
                    beginningOfProcedureCall = startOfCalledObject.with(undefined, i);
                    break;
                } else {
                    break;
                }
            }
        }

        let procedureCallRange = new vscode.Range(beginningOfProcedureCall, endOfProcedureCall);
        return procedureCallRange;

    }
    expandToCalledObject(document: vscode.TextDocument, positionOfDot: vscode.Position): vscode.Position | undefined {
        let rangeOfCalledObject: vscode.Range | undefined = DocumentUtils.getPreviousWordRange(document, positionOfDot);
        if (!rangeOfCalledObject) {
            throw new Error('Could not find return type');
        }
        return rangeOfCalledObject.start;
    }
    expandToFieldOrProcedureAndObject(document: vscode.TextDocument, positionOfAssignment: vscode.Position): vscode.Position | undefined {
        let line = document.lineAt(positionOfAssignment.line).text;
        let rangeOfFieldOrProcedure: vscode.Range | undefined = DocumentUtils.getPreviousWordRange(document, positionOfAssignment);
        if (!rangeOfFieldOrProcedure) {
            throw new Error('Could not find return type');
        }
        let char = line.charAt(rangeOfFieldOrProcedure.start.character - 1);
        if (char === '.') {
            let rangeOfCalledObject: vscode.Range | undefined = DocumentUtils.getPreviousWordRange(document, rangeOfFieldOrProcedure.start.translate(0, -1));
            if (!rangeOfCalledObject) {
                throw new Error('Could not find return type');
            }
            return rangeOfCalledObject.start;
        }
        return rangeOfFieldOrProcedure.start;
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
        return d.range.contains(range);
    }
}