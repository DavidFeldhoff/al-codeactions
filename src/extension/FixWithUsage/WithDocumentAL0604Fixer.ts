import * as vscode from 'vscode';
import { SyntaxTreeExt } from './../AL Code Outline Ext/syntaxTreeExt';
import { TextRangeExt } from './../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from './../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from './../AL Code Outline/syntaxTree';
import { WithDocument } from './WithDocument';
import { WithDocumentFixer } from './WithDocumentFixer';

export class WithDocumentAL0604Fixer implements WithDocumentFixer {
    withDocuments: WithDocument[];
    openedDocuments: WithDocument[];
    noOfUsagesFixed: number;
    noOfDocsFixed: number;
    constructor() {
        this.withDocuments = [];
        this.openedDocuments = [];
        this.noOfUsagesFixed = 0;
        this.noOfDocsFixed = 0;
    }
    addDocument(uri: vscode.Uri) {
        this.withDocuments.push(new WithDocument(uri));
    }
    async fixWithUsagesOfAllDocuments() {
        let cancelled: boolean = false;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Fix implicit with usages',
            cancellable: true
        }, async (progress, token) => {
            token.onCancellationRequested(() => {
                vscode.window.showInformationMessage('The operation was canceled. Maybe a few files were already saved, so please check your version control system.');
                cancelled = true;
            });
            progress.report({
                increment: 0
            });

            for (let i = 0; i < this.withDocuments.length; i++) {
                while (this.openedDocuments.length > 50) {
                    this.sleep(100);
                }
                if (cancelled) {
                    return;
                }
                this.openedDocuments.push(this.withDocuments[i]);
                await this.fixImplicitWithUsagesOfDocument(this.withDocuments[i]);

                progress.report({
                    message: (i + 1) + ' / ' + this.withDocuments.length,
                    increment: (1 / this.withDocuments.length) * 100
                });
            }
        });
    }
    private async fixImplicitWithUsagesOfDocument(withDocument: WithDocument) {
        let finished: boolean = false;
        await withDocument.openTextDocument();
        // do {
        let implicitWithUsages: vscode.Diagnostic[] = withDocument.getAL0604Warnings();
        let edit = new vscode.WorkspaceEdit();

        for (let i = 0; i < implicitWithUsages.length; i++) {
            edit.insert(withDocument.uri, implicitWithUsages[i].range.start, 'Rec.');
        }
        // if (implicitWithUsages.length >= 100) {
        //     let diagnosticWatcher: Promise<boolean> = this.startDiagnosticWatcher(withDocument, withDocument.getAL0604Warnings());
        //     await vscode.workspace.applyEdit(edit);
        //     finished = await diagnosticWatcher;
        // } else {
        await vscode.workspace.applyEdit(edit);
        // finished = true;
        // }
        // } while (!finished);
        // let settings = vscode.workspace.getConfiguration('alCodeActions', withDocument.uri);
        // let addPragma = settings.get<boolean>('addPragmaToDisableImplicitWith');
        // if (addPragma) {
        //     let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(withDocument.getDocument());
        //     let alFullSyntaxTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, firstWarning);
        //     if (alFullSyntaxTreeNode) {
        //         let objectRange: vscode.Range = TextRangeExt.createVSCodeRange(alFullSyntaxTreeNode.fullSpan);
        //         let edit = new vscode.WorkspaceEdit();
        //         edit.insert(withDocument.uri, objectRange.start, '#pragma implicitwith disable\r\n');
        //         edit.insert(withDocument.uri, objectRange.end, '\r\n#pragma implicitwith restore');
        //         await vscode.workspace.applyEdit(edit);
        //     }
        // }
        // SyntaxTree.clearInstance(withDocument.getDocument());
        this.noOfUsagesFixed += implicitWithUsages.length;
        this.noOfDocsFixed++;
        await withDocument.getDocument().save();
        let index = this.openedDocuments.indexOf(withDocument);
        if (index > 0) {
            this.openedDocuments.splice(index, 1);
        }
    }
    public getNoOfUsagesFixed(): number{
        return this.noOfUsagesFixed;
    }
    public getNoOfDocsFixed(): number{
        return this.noOfDocsFixed;
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