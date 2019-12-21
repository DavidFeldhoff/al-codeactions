import * as vscode from 'vscode';
import { isUndefined, isNull } from 'util';
import { ALProcedure } from './alProcedure';
import { ALProcedureObjectCreator } from './alProcedureObjectCreator';
import { RegExpCreator } from './regexpCreator';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ALObject } from './alObject';

export class ProcedureCreator implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];


    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        let diagnostic = this.getDiagnosticOfCurrentPosition(document, range);
        if (isUndefined(diagnostic)) {
            return;
        }

        if (!this.considerLine(document, range, diagnostic)) {
            return;
        }

        let procedureToCreate: ALProcedure | undefined;
        procedureToCreate = this.getProcedureToCreate(document, diagnostic);
        if (isUndefined(procedureToCreate)) {
            return;
        }

        let codeActionToCreateProcedure: vscode.CodeAction | undefined;
        codeActionToCreateProcedure = await this.createCodeAction(document, diagnostic, procedureToCreate);
        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            return [codeActionToCreateProcedure];
        }
    }
    async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, procedureToCreate: ALProcedure): Promise<vscode.CodeAction | undefined> {
        let codeActionToCreateProcedure: vscode.CodeAction | undefined;
        switch (diagnostic.code as string) {
            case SupportedDiagnosticCodes.AL0132.toString():
                await this.findDocumentOfALObject(procedureToCreate.ObjectOfProcedure).then(otherDocument => {
                    if (!isUndefined(otherDocument)) {
                        codeActionToCreateProcedure = this.createFixToCreateProcedure(procedureToCreate, otherDocument);
                    }
                });
                break;
            case SupportedDiagnosticCodes.AL0118.toString():
                codeActionToCreateProcedure = this.createFixToCreateProcedure(procedureToCreate, currentDocument, diagnostic.range.start.line);
                break;
            default:
                return;
        }

        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            codeActionToCreateProcedure.isPreferred = true;
            return codeActionToCreateProcedure;
        }
    }
    async findDocumentOfALObject(alObject: ALObject): Promise<vscode.TextDocument | undefined> {
        let regexFirstLine = new RegExp(alObject.type + "\\s\\d+\\s\"?" + alObject.name + "\"?", "i");
        let returnDocument: vscode.TextDocument | undefined;
        await vscode.workspace.findFiles('**/*.al').then(async files => {
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                await vscode.workspace.openTextDocument(file).then(document => {
                    let firstLine = document.lineAt(0).text;
                    if (regexFirstLine.test(firstLine)) {
                        returnDocument = document;
                        return;
                    }
                });
                if (!isUndefined(returnDocument)) {
                    break;
                }
            }
        });
        return returnDocument;
    }

    private getDiagnosticOfCurrentPosition(document: vscode.TextDocument, range: vscode.Range) {
        let diagnostics = vscode.languages.getDiagnostics(document.uri).filter(d => {
            let isAL = this.checkDiagnosticsLanguage(d);
            let samePos = this.checkDiagnosticsPosition(d, range);
            let validCode: boolean = this.checkDiagnosticsCode(d);
            return isAL && samePos && validCode;
        });

        return diagnostics.length === 1 ? diagnostics[0] : undefined;
    }
    checkDiagnosticsCode(d: vscode.Diagnostic): boolean {
        if (isUndefined(d.code)) {
            return false;
        }
        let supportedDiagnosticCodes: string[] = [];
        for (var enumMember in SupportedDiagnosticCodes) {
            supportedDiagnosticCodes.push(enumMember.toString());
        }
        return supportedDiagnosticCodes.includes(d.code.toString());
    }

    private checkDiagnosticsPosition(d: vscode.Diagnostic, range: vscode.Range) {
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

    private checkDiagnosticsLanguage(d: vscode.Diagnostic) {
        if (isUndefined(d.source)) {
            return false;
        }
        return d.source.toLowerCase() === 'al';
    }

    private considerLine(document: vscode.TextDocument, range: vscode.Range, diagnostic: vscode.Diagnostic): boolean {
        let textLine = document.lineAt(diagnostic.range.end.line).text;
        if (textLine.length > diagnostic.range.end.character) {
            let nextCharacter = textLine.charAt(diagnostic.range.end.character);
            if (nextCharacter === '(' && textLine.substr(diagnostic.range.end.character).includes(')')) {
                return true;
            }
        }
        return false;
    }

    private createFixToCreateProcedure(procedure: ALProcedure, document: vscode.TextDocument, currentLineNo?: number): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Create procedure ${procedure.name}`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();

        let position = this.getPositionToInsertProcedure(document, currentLineNo);
        let textToInsert = ALProcedureObjectCreator.createProcedureDefinition(procedure);
        textToInsert = this.addLineBreaksToProcedureCall(document, position, textToInsert);
        fix.edit.insert(document.uri, position, textToInsert);
        return fix;
    }

    private addLineBreaksToProcedureCall(document: vscode.TextDocument, position: vscode.Position, textToInsert: string) {
        if (document.getText(new vscode.Range(position, position.translate(0, 1))) === "}") {
            textToInsert = textToInsert + "\r\n";
        }
        else {
            textToInsert = "\r\n\r\n" + textToInsert;
        }
        return textToInsert;
    }

    getPositionToInsertProcedure(document: vscode.TextDocument, currentLineNo: number | undefined): vscode.Position {
        let position;
        if (!isUndefined(currentLineNo)) {
            position = this.getNextPositionToInsertProcedureStartingAtLine(document, currentLineNo);
        } else {
            position = this.getLastPositionToInsertProcedureStartingAtEndOfDocument(document);
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
            throw new Error("Unable to position to insert procedure.");
        } else {
            return new vscode.Position(lineOfClosingBracket,0);
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

    private getProcedureToCreate(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): ALProcedure | undefined {
        let lineText = document.lineAt(diagnostic.range.start).text;

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

            let alProcedureCreator = new ALProcedureObjectCreator(document, procedureCallRange);
            let procedureToCreate = alProcedureCreator.getProcedure();
            return procedureToCreate;
        }
    }
}