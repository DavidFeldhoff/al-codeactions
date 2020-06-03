import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { SupportedDiagnosticCodes } from '../Create Procedure/supportedDiagnosticCodes';
import { DocumentUtils } from './documentUtils';
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from '../AL Code Outline Ext/syntaxTreeExt';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALProcedure } from '../Entities/alProcedure';
import { AZSymbolInformation } from '../AL Code Outline/AZSymbolInformation';
import { AZDocumentSymbolsLibrary } from '../AL Code Outline/azALDocumentSymbolsService';
import { AZSymbolInformationExt } from '../AL Code Outline Ext/azSymbolInformationExt';
import { AZSymbolKind } from '../AL Code Outline/azSymbolKind';

export class ALSourceCodeHandler {

    private document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }
    public async getPositionToInsertProcedure(currentLineNo: number | undefined, procedureToInsert: ALProcedure): Promise<vscode.Position> {
        let azDocumentSymbolsLibrary: AZDocumentSymbolsLibrary = await AZDocumentSymbolsLibrary.getInstance(this.document);
        let objectSymbol = azDocumentSymbolsLibrary.getObjectSymbol();
        if (!objectSymbol) {
            throw new Error('Unable to get position to insert the procedure.');
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
            //AZSymbolKind.RecallNotificationHandler, // is missing
            AZSymbolKind.ReportHandlerDeclaration,
            AZSymbolKind.RequestPageHandlerDeclaration,
            AZSymbolKind.SendNotificationHandlerDeclaration,
            AZSymbolKind.SessionSettingsHandlerDeclaration,
            AZSymbolKind.StrMenuHandlerDeclaration
        ];
        let kinds: AZSymbolKind[] = testKinds.concat([
            AZSymbolKind.TriggerDeclaration,
            AZSymbolKind.MethodDeclaration,
            AZSymbolKind.LocalMethodDeclaration,
            AZSymbolKind.EventSubscriberDeclaration,
            AZSymbolKind.EventDeclaration,
            AZSymbolKind.BusinessEventDeclaration,
            AZSymbolKind.IntegrationEventDeclaration,
            AZSymbolKind.GlobalVarSection
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