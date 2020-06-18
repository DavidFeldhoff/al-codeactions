import { RangeAnalyzer } from './../Extract Procedure/rangeAnalyzer';
import { ALSystemFunctions } from './alSystemFunctions';
import { ALObjectParser } from './../Entity Parser/alObjectParser';
import { SyntaxTreeExt } from './../AL Code Outline Ext/syntaxTreeExt';
import { DocumentUtils } from './../Utils/documentUtils';
import { TypeDetective } from './../Utils/typeDetective';
import { TextRangeExt } from './../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from './../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { WithDocumentFixer } from './WithDocumentFixer';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import * as vscode from 'vscode';
import { WithDocument } from './WithDocument';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { ALObject } from '../Entities/alObject';
import { exit } from 'process';
import { transcode } from 'buffer';

export class WithDocumentAL0606Fixer implements WithDocumentFixer {
    withDocuments: WithDocument[];
    openedDocuments: WithDocument[];
    constructor() {
        this.withDocuments = [];
        this.openedDocuments = [];
    }
    addDocument(uri: vscode.Uri) {
        this.withDocuments.push(new WithDocument(uri));
    }
    async fixWithUsagesOfAllDocuments() {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Fix explicit with usages',
            cancellable: true
        }, async (progress, token) => {
            token.onCancellationRequested(() => {
                vscode.window.showInformationMessage('The operation was canceled. Maybe a few files were already saved, so please check your version control system.');
            });
            progress.report({
                increment: 0
            });

            for (let i = 0; i < this.withDocuments.length; i++) {
                while (this.openedDocuments.length > 50) {
                    this.sleep(100);
                }
                this.openedDocuments.push(this.withDocuments[i]);
                await this.fixExplicitWithUsagesOfDocument(this.withDocuments[i]);

                progress.report({
                    message: (i + 1) + ' / ' + this.withDocuments.length,
                    increment: (1 / this.withDocuments.length) * 100
                });
            }
        });
    }
    private async fixExplicitWithUsagesOfDocument(withDocument: WithDocument) {
        let firstWarning: vscode.Position;
        let finished: boolean = false;
        await withDocument.openTextDocument();
        do {
            let withTreeNodes: ALFullSyntaxTreeNode[] = await this.loadWithTreeNodes(withDocument);

            let editToInsertQualifiers: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
            for (let i = 0; i < withTreeNodes.length; i++) {
                await this.fixWithTreeNode(withTreeNodes[i], withDocument.getDocument(), editToInsertQualifiers);
            }
            await vscode.workspace.applyEdit(editToInsertQualifiers);
            //reload to get new syntaxTree with applied qualifiers.
            SyntaxTree.clearInstance(withDocument.getDocument());
            withTreeNodes = await this.loadWithTreeNodes(withDocument);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(withDocument.getDocument());

            let editToDeleteWithStatements: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
            for (let i = 0; i < withTreeNodes.length; i++) {
                this.deleteWithStatement(withTreeNodes[i], withDocument.getDocument(), editToDeleteWithStatements);

                let parentNode = withTreeNodes[i].parentNode;
                if (parentNode && parentNode.kind) {
                    let anotherWithStatement: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(TextRangeExt.createVSCodeRange(parentNode.fullSpan).start, [FullSyntaxTreeNodeKind.getWithStatement()]);
                    if (anotherWithStatement) {
                        //reload to get new syntax tree with correct intendation
                        await vscode.workspace.applyEdit(editToDeleteWithStatements);
                        editToDeleteWithStatements = new vscode.WorkspaceEdit();
                        SyntaxTree.clearInstance(withDocument.getDocument());
                        withTreeNodes = await this.loadWithTreeNodes(withDocument);
                        i = -1;
                        continue;
                    }
                }
            }
            let explicitWithUsages: vscode.Diagnostic[] = withDocument.getAL0606Warnings();
            if (explicitWithUsages.length >= 100) {
                let diagnosticWatcher: Promise<boolean> = this.startDiagnosticWatcher(withDocument, withDocument.getAL0604Warnings());
                await vscode.workspace.applyEdit(editToDeleteWithStatements);
                finished = await diagnosticWatcher;
            } else {
                let edited: boolean = await vscode.workspace.applyEdit(editToDeleteWithStatements);
                finished = true;
            }
        } while (!finished);

        await withDocument.getDocument().save();
        let index = this.openedDocuments.indexOf(withDocument);
        if (index > 0) {
            this.openedDocuments.splice(index, 1);
        }
    }
    async loadWithTreeNodes(withDocument: WithDocument): Promise<ALFullSyntaxTreeNode[]> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(withDocument.getDocument());
        let withTreeNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getWithStatement());
        withTreeNodes = withTreeNodes.sort((a, b) => a.span && b.span && a.span.start && b.span.start ? b.span.start.line - a.span.start.line : 0);
        return withTreeNodes;
    }
    deleteWithStatement(withTreeNode: ALFullSyntaxTreeNode, withDocument: vscode.TextDocument, editToDeleteWithStatements: vscode.WorkspaceEdit) {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(withTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!identifierTreeNode) {
            return;
        }

        let blockTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(withTreeNode, FullSyntaxTreeNodeKind.getBlock(), false);
        let rangeOfWithNode: vscode.Range = DocumentUtils.trimRange(withDocument, TextRangeExt.createVSCodeRange(withTreeNode.fullSpan));
        if (blockTreeNode) {
            if (blockTreeNode.childNodes && blockTreeNode.childNodes.length > 0) {
                let firstTreeNode: ALFullSyntaxTreeNode = blockTreeNode.childNodes[0];
                let lastTreeNode: ALFullSyntaxTreeNode = blockTreeNode.childNodes[blockTreeNode.childNodes.length - 1];
                let rangeOfFirstNode: vscode.Range = DocumentUtils.trimRange(withDocument, TextRangeExt.createVSCodeRange(firstTreeNode.fullSpan));
                let rangeOfLastNode: vscode.Range = DocumentUtils.trimRange(withDocument, TextRangeExt.createVSCodeRange(lastTreeNode.fullSpan));
                let rangeOfBody: vscode.Range = new vscode.Range(rangeOfFirstNode.start.line, 0, rangeOfLastNode.end.line, rangeOfLastNode.end.character);
                let contentOfBody = withDocument.getText(rangeOfBody);
                if (rangeOfWithNode.start.line !== rangeOfFirstNode.start.line && rangeOfWithNode.start.character < rangeOfFirstNode.start.character) {
                    let indentToDecrease = rangeOfFirstNode.start.character - rangeOfWithNode.start.character;
                    contentOfBody = this.fixIndentOfContent(indentToDecrease, contentOfBody);
                }
                editToDeleteWithStatements.replace(withDocument.uri, rangeOfWithNode, contentOfBody.trimLeft());
            } else {
                editToDeleteWithStatements.delete(withDocument.uri, rangeOfWithNode);
            }
        } else {
            if (withTreeNode.childNodes && withTreeNode.childNodes.length === 2) {
                let rangeOfWith: vscode.Range = DocumentUtils.trimRange(withDocument, TextRangeExt.createVSCodeRange(withTreeNode.fullSpan));
                let rangeOfChild: vscode.Range = DocumentUtils.trimRange(withDocument, TextRangeExt.createVSCodeRange(withTreeNode.childNodes[1].fullSpan));
                let contentOfBody: string = withDocument.getText(rangeOfChild);
                if (rangeOfWith.start.line !== rangeOfChild.start.line && rangeOfWith.start.character < rangeOfChild.start.character) {
                    let indentToDecrease = rangeOfChild.start.character - rangeOfWith.start.character;
                    contentOfBody = this.fixIndentOfContent(indentToDecrease, contentOfBody);
                }
                editToDeleteWithStatements.replace(withDocument.uri, rangeOfWith, contentOfBody.trimLeft());
            }
        }
    }

    fixIndentOfContent(indentToFix: number, content: string): string {
        content = '\r\n' + content;
        let regExp: RegExp = new RegExp("\\r\\n\\s{0," + indentToFix + "}",'g');
        content = content.replace(regExp, '\r\n');
        return content.substr(4); //delete \r\n again
    }

    private async fixWithTreeNode(withTreeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument, edit: vscode.WorkspaceEdit) {
        let nameOfWithStatement: string = this.getNameOfWithStatement(withTreeNode, document);
        let typeOfWithStatement: string = await this.getTypeOfWithStatement(withTreeNode, document);

        await this.checkAndFixIdentifierTreeNodes(document, withTreeNode, nameOfWithStatement, typeOfWithStatement, edit);
    }
    private async checkAndFixIdentifierTreeNodes(document: vscode.TextDocument, withTreeNode: ALFullSyntaxTreeNode, nameOfWithStatement: string, typeOfWithStatement: string, edit: vscode.WorkspaceEdit) {
        let uriOfWithStatement: vscode.Uri | undefined;
        let identifierNodesToTest: ALFullSyntaxTreeNode[] = [];
        if (withTreeNode.childNodes && withTreeNode.childNodes.length === 2) {
            ALFullSyntaxTreeNodeExt.collectChildNodes(withTreeNode.childNodes[1], FullSyntaxTreeNodeKind.getIdentifierName(), true, identifierNodesToTest);
            for (let i = 0; i < identifierNodesToTest.length; i++) {
                let parentNode: ALFullSyntaxTreeNode | undefined = identifierNodesToTest[i].parentNode;
                if (parentNode && parentNode.kind && parentNode.kind !== FullSyntaxTreeNodeKind.getMemberAccessExpression()) {
                    let range: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierNodesToTest[i].fullSpan));
                    let destinationOfIdentifier: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, range.start);
                    if (destinationOfIdentifier && destinationOfIdentifier.length > 0) {
                        uriOfWithStatement = await this.fixIfSameUri(uriOfWithStatement, destinationOfIdentifier, typeOfWithStatement, edit, document, range, nameOfWithStatement);
                    } else {
                        this.fixIfSystemFunction(document, range, typeOfWithStatement, edit, nameOfWithStatement);
                    }
                }
            }
        }
    }
    private fixIfSystemFunction(document: vscode.TextDocument, range: vscode.Range, typeOfWithStatement: string, edit: vscode.WorkspaceEdit, nameOfWithStatement: string) {
        let identifierText: string = document.getText(range);
        if (this.isIdentifierSystemFunction(identifierText, typeOfWithStatement)) {
            edit.insert(document.uri, range.start, nameOfWithStatement + '.');
        }
    }

    private async fixIfSameUri(uriOfWithStatement: vscode.Uri | undefined, destinationOfIdentifier: vscode.Location[], typeOfWithStatement: string, edit: vscode.WorkspaceEdit, document: vscode.TextDocument, range: vscode.Range, nameOfWithStatement: string) {
        //TODO: Same URI is not enough. Has to be the same object
        if (!uriOfWithStatement) {
            let otherDocument: vscode.TextDocument | undefined = await vscode.workspace.openTextDocument(destinationOfIdentifier[0].uri);
            if (otherDocument) {
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(otherDocument);
                let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, destinationOfIdentifier[0].range.start);
                if (objectTreeNode) {
                    let alObject: ALObject = ALObjectParser.parseObjectTreeNodeToALObject(otherDocument, objectTreeNode);
                    if (typeOfWithStatement.toLowerCase().trim() === alObject.getTypeString().toLowerCase().trim()) {
                        uriOfWithStatement = otherDocument.uri;
                    }
                }
            }
        }
        if (uriOfWithStatement && uriOfWithStatement.toString() === destinationOfIdentifier[0].uri.toString()) {
            edit.insert(document.uri, range.start, nameOfWithStatement + '.');
        }
        return uriOfWithStatement;
    }

    isIdentifierSystemFunction(identifierText: string, typeOfWithStatement: string): boolean {
        let typeTrimmed = typeOfWithStatement.toLowerCase().trim();
        let systemFunctions: string[];
        if (typeTrimmed.startsWith('record')) {
            systemFunctions = ALSystemFunctions.getSystemFunctionsOfRecord;
        } else if (typeTrimmed.startsWith('page')) {
            systemFunctions = ALSystemFunctions.getSystemFunctionsOfPage;
        } else if (typeTrimmed.startsWith('report')) {
            systemFunctions = ALSystemFunctions.getSystemFunctionsOfReport;
        } else if (typeTrimmed.startsWith('codeunit')) {
            systemFunctions = ALSystemFunctions.getSystemFunctionsOfCodeunit;
        } else if (typeTrimmed.startsWith('xmlport')) {
            systemFunctions = ALSystemFunctions.getSystemFunctionsOfXmlPort;
        } else if (typeTrimmed.startsWith('enum')) {
            systemFunctions = ALSystemFunctions.getSystemFunctionsOfEnum;
        } else {
            return false;
        }
        return systemFunctions.some(sf => sf.toLowerCase() === identifierText.toLowerCase().trim());
    }

    getNameOfWithStatement(withTreeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument): string {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(withTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!identifierTreeNode) {
            throw new Error('The with statement has to have an identifier.');
        }
        return document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan)));
    }
    async getTypeOfWithStatement(withTreeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument): Promise<string> {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(withTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!identifierTreeNode) {
            throw new Error('The with statement has to have an identifier.');
        }
        let typeDetective: TypeDetective = new TypeDetective(document, identifierTreeNode);
        await typeDetective.getTypeOfTreeNode();
        return typeDetective.getType();
    }

    async startDiagnosticWatcher(withDocument: WithDocument, diagnosticsBeforeApplyEdit: vscode.Diagnostic[]): Promise<boolean> {
        let changed: boolean = false;
        let finished: boolean = false;
        do {
            let currentDiagnostics = withDocument.getAL0604Warnings();
            changed = (currentDiagnostics.length !== diagnosticsBeforeApplyEdit.length) ||
                (currentDiagnostics.length > 0 && diagnosticsBeforeApplyEdit.length > 0 &&
                    currentDiagnostics[0].range.start.compareTo(diagnosticsBeforeApplyEdit[0].range.start) !== 0);
            finished = currentDiagnostics.length === 0;
            await this.sleep(100);
        } while (!changed);
        return finished;
    }
    sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}