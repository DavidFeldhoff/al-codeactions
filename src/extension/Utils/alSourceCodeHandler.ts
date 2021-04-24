import * as vscode from 'vscode';
import { AZSymbolInformationExt } from '../AL Code Outline Ext/azSymbolInformationExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { AZDocumentSymbolsLibrary } from '../AL Code Outline/azALDocumentSymbolsService';
import { AZSymbolInformation } from '../AL Code Outline/AZSymbolInformation';
import { AZSymbolKind } from '../AL Code Outline/azSymbolKind';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALProcedure } from '../Entities/alProcedure';
import { DocumentUtils } from './documentUtils';
import { Err } from './Err';

export class ALSourceCodeHandler {

    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }
    public async getPositionToInsertProcedure(currentLineNo: number | undefined, procedureToInsert: ALProcedure): Promise<vscode.Position> {
        let azDocumentSymbolsLibrary: AZDocumentSymbolsLibrary = await AZDocumentSymbolsLibrary.getInstance(this.document);
        let objectSymbol = azDocumentSymbolsLibrary.getObjectSymbol();
        if (!objectSymbol) {
            Err._throw('Unable to get position to insert the procedure.');
        }
        let allMethods: AZSymbolInformation[] = [];
        let testKinds: AZSymbolKind[] = [
            AZSymbolKind.TestDeclaration,
            AZSymbolKind.ConfirmHandlerDeclaration,
            AZSymbolKind.FilterPageHandlerDeclaration,
            AZSymbolKind.HyperlinkHandlerDeclaration,
            AZSymbolKind.MessageHandlerDeclaration,
            AZSymbolKind.ModalPageHandlerDeclaration,
            AZSymbolKind.PageHandlerDeclaration,
            //AZSymbolKind.RecallNotificationHandler, // is missing, so I'll insert 238 manually
            238,
            AZSymbolKind.ReportHandlerDeclaration,
            AZSymbolKind.RequestPageHandlerDeclaration,
            AZSymbolKind.SendNotificationHandlerDeclaration,
            AZSymbolKind.SessionSettingsHandlerDeclaration,
            AZSymbolKind.StrMenuHandlerDeclaration
        ];
        let kinds: AZSymbolKind[] = [AZSymbolKind.TriggerDeclaration];
        kinds = kinds.concat(testKinds);
        kinds = kinds.concat([
            AZSymbolKind.MethodDeclaration,
            AZSymbolKind.LocalMethodDeclaration,
            AZSymbolKind.EventSubscriberDeclaration,
            AZSymbolKind.EventDeclaration,
            AZSymbolKind.BusinessEventDeclaration,
            AZSymbolKind.IntegrationEventDeclaration
        ]);
        AZSymbolInformationExt.collectChildNodes(objectSymbol, kinds, false, allMethods);
        allMethods.sort((methodA, methodB) => {
            if (methodA.kind !== methodB.kind) {
                return (kinds.indexOf(methodA.kind) - kinds.indexOf(methodB.kind));
            }
            let rangeA: vscode.Range = TextRangeExt.createVSCodeRange(methodA.range);
            let rangeB: vscode.Range = TextRangeExt.createVSCodeRange(methodB.range);
            return rangeA.start.compareTo(rangeB.start);
        });
        let procedureToInsertKind: AZSymbolKind = AZSymbolInformationExt.getSymbolKindOfALProcedure(procedureToInsert);
        let filteredMethods: AZSymbolInformation[] = allMethods.filter(method => method.kind === procedureToInsertKind);
        if (filteredMethods.length !== 0) {
            return TextRangeExt.createVSCodeRange(filteredMethods[filteredMethods.length - 1].range).end;
        }
        for (let i = kinds.indexOf(procedureToInsertKind) + 1; i < kinds.length; i++) {
            let filteredMethods: AZSymbolInformation[] = allMethods.filter(method => method.kind === kinds[i]);
            if (filteredMethods.length !== 0) {
                return TextRangeExt.createVSCodeRange(filteredMethods[0].range).start;
            }
        }
        for (let i = kinds.indexOf(procedureToInsertKind) - 1; i >= 0; i--) {
            let filteredMethods: AZSymbolInformation[] = allMethods.filter(method => method.kind === kinds[i]);
            if (filteredMethods.length !== 0) {
                return TextRangeExt.createVSCodeRange(filteredMethods[filteredMethods.length - 1].range).end;
            }
        }
        return DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(objectSymbol.range)).end.translate(0, -1);
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