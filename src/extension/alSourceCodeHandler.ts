import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { SupportedDiagnosticCodes } from './Create Procedure/supportedDiagnosticCodes';
import { DocumentUtils } from './documentUtils';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';

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
        objectSymbol.collectChildSymbols(428, true, globalVarSection);
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

    public async isInvocationExpression(range: vscode.Range): Promise<boolean>{
        let textLine = this.document.lineAt(range.end.line).text;
        if (textLine.length > range.end.character) {
            let nextCharacter = textLine.charAt(range.end.character);
            if (nextCharacter === '(') {
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
                let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
                if (invocationExpressionTreeNode) {
                    return true;
                }
            }
        }
        return false;
    }
}