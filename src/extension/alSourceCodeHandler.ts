import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { SupportedDiagnosticCodes } from './Create Procedure/supportedDiagnosticCodes';
import { DocumentUtils } from './documentUtils';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from './AL Code Outline Ext/syntaxTreeExt';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';

export class ALSourceCodeHandler {

    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }
    public async getPositionToInsertProcedure(currentLineNo: number | undefined): Promise<vscode.Position> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let objectTreeNode: ALFullSyntaxTreeNode = await this.getObjectTreeNode(currentLineNo);
        if (currentLineNo) {
            let position = new vscode.Position(currentLineNo, 0);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, new vscode.Position(currentLineNo, 0));
            if (methodOrTriggerTreeNode && methodOrTriggerTreeNode.parentNode && methodOrTriggerTreeNode.parentNode === objectTreeNode) {
                return TextRangeExt.createVSCodeRange(methodOrTriggerTreeNode.fullSpan).end;
            }
        }
        let positionToInsert: vscode.Position | undefined = this.getLastMethodOrTrigger(objectTreeNode);
        if (positionToInsert) {
            return positionToInsert;
        } else {
            let objectRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(objectTreeNode.fullSpan));
            return objectRange.end.translate(0, -1);
        }
    }
    private getLastMethodOrTrigger(objectTreeNode: ALFullSyntaxTreeNode): vscode.Position | undefined {
        let methodOrTriggers: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(objectTreeNode, FullSyntaxTreeNodeKind.getMethodDeclaration(), false, methodOrTriggers);
        ALFullSyntaxTreeNodeExt.collectChildNodes(objectTreeNode, FullSyntaxTreeNodeKind.getTriggerDeclaration(), false, methodOrTriggers);
        let lastPosition: vscode.Position | undefined;
        for (let i = 0; i < methodOrTriggers.length; i++) {
            let rangeOfMethodOrTrigger: vscode.Range = TextRangeExt.createVSCodeRange(methodOrTriggers[i].fullSpan);
            if (!lastPosition) {
                lastPosition = rangeOfMethodOrTrigger.end;
            } else if (rangeOfMethodOrTrigger.end.compareTo(lastPosition) > 0) {
                lastPosition = rangeOfMethodOrTrigger.end;
            }
        }
        return lastPosition;
    }
    private async getObjectTreeNode(currentLineNo: number | undefined): Promise<ALFullSyntaxTreeNode> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        if (currentLineNo) {
            return SyntaxTreeExt.getObjectTreeNode(syntaxTree, new vscode.Position(currentLineNo, 0)) as ALFullSyntaxTreeNode;
        } else {
            return SyntaxTreeExt.getObjectTreeNode(syntaxTree, new vscode.Position(0, 0)) as ALFullSyntaxTreeNode;
        }
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
                return new vscode.Position(i + 1, 0);
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
                return new vscode.Position(i + 1, 0);
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

    public async isInvocationExpression(range: vscode.Range): Promise<boolean> {
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