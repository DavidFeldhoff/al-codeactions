import * as vscode from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from './../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from './../AL Code Outline Ext/syntaxTreeExt';
import { TextRangeExt } from './../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from './../AL Code Outline/alFullSyntaxTreeNode';
import { DocumentUtils } from './../Utils/documentUtils';
import { TypeDetective } from './../Utils/typeDetective';
import { ALSystemFunctions } from './alSystemFunctions';
import { WithDocument } from './WithDocument';
import { WithDocumentFixer } from './WithDocumentFixer';
import * as fs from 'fs';

export class WithDocumentAL0606Fixer implements WithDocumentFixer {
    withDocuments: WithDocument[];
    openedDocuments: WithDocument[];
    noOfDocsFixed: number;
    noOfUsagesFixed: number;
    constructor() {
        this.withDocuments = [];
        this.openedDocuments = [];
        this.noOfDocsFixed = 0;
        this.noOfUsagesFixed = 0;
    }
    addDocument(uri: vscode.Uri) {
        this.withDocuments.push(new WithDocument(uri));
    }
    async fixWithUsagesOfAllDocuments() {
        let cancelled: boolean = false;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Fix explicit with usages',
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
                await this.fixExplicitWithUsagesOfDocument(this.withDocuments[i]);

                progress.report({
                    message: (i + 1) + ' / ' + this.withDocuments.length,
                    increment: (1 / this.withDocuments.length) * 100
                });
            }
        });
    }
    private async fixExplicitWithUsagesOfDocument(withDocument: WithDocument) {
        let finished: boolean = false;
        await withDocument.openTextDocument();
        // do {
        let withTreeNodes: ALFullSyntaxTreeNode[] = await this.getWithTreeNodesInDescendingOrder(withDocument);

        let editToInsertQualifiers: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
        for (let i = 0; i < withTreeNodes.length; i++) {
            await this.fixWithTreeNode(withTreeNodes[i], withDocument.getDocument(), editToInsertQualifiers);
        }
        await vscode.workspace.applyEdit(editToInsertQualifiers);
        //reload to get new syntaxTree with applied qualifiers.
        SyntaxTree.clearInstance(withDocument.getDocument());
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(withDocument.getDocument());
        withTreeNodes = await this.getWithTreeNodesInDescendingOrder(withDocument);

        let editToDeleteWithStatements: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
        for (let i = 0; i < withTreeNodes.length; i++) {
            await this.addWorkspaceEditToDeleteWithStatement(withTreeNodes[i], withDocument.getDocument(), editToDeleteWithStatements);

            let parentNode = withTreeNodes[i].parentNode;
            if (parentNode && parentNode.kind) {
                let anotherWithStatement: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(TextRangeExt.createVSCodeRange(parentNode.fullSpan).start, [FullSyntaxTreeNodeKind.getWithStatement()]);
                if (anotherWithStatement) {
                    //reload to get new syntax tree with correct intendation
                    await vscode.workspace.applyEdit(editToDeleteWithStatements);
                    editToDeleteWithStatements = new vscode.WorkspaceEdit();
                    SyntaxTree.clearInstance(withDocument.getDocument());
                    withTreeNodes = await this.getWithTreeNodesInDescendingOrder(withDocument);
                    i = -1; //start again
                    continue;
                }
            }
        }
        let explicitWithUsages: vscode.Diagnostic[] = withDocument.getAL0606Warnings();
        // if (explicitWithUsages.length >= 100) {
        //     let diagnosticWatcher: Promise<boolean> = this.startDiagnosticWatcher(withDocument, withDocument.getAL0606Warnings());
        //     await vscode.workspace.applyEdit(editToDeleteWithStatements);
        //     finished = await diagnosticWatcher;
        // } else {
        let edited: boolean = await vscode.workspace.applyEdit(editToDeleteWithStatements);
        //         finished = true;
        //     }
        // } while (!finished);
        this.noOfUsagesFixed += explicitWithUsages.length;
        this.noOfDocsFixed ++;
        await withDocument.getDocument().save();
        let index = this.openedDocuments.indexOf(withDocument);
        if (index > 0) {
            this.openedDocuments.splice(index, 1);
        }
    }
    async getWithTreeNodesInDescendingOrder(withDocument: WithDocument): Promise<ALFullSyntaxTreeNode[]> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(withDocument.getDocument());
        let withTreeNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getWithStatement());
        withTreeNodes = withTreeNodes.sort((a, b) => a.span && b.span && a.span.start && b.span.start ? b.span.start.line - a.span.start.line : 0);
        return withTreeNodes;
    }
    async addWorkspaceEditToDeleteWithStatement(withTreeNode: ALFullSyntaxTreeNode, withDocument: vscode.TextDocument, editToDeleteWithStatements: vscode.WorkspaceEdit) {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(withTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!identifierTreeNode) {
            return;
        }
        if (!await this.getLocationOfObject(withDocument, withTreeNode)) { //if it was not fixed then don't delete the with
            return;
        }
        let isBlockNeeded: Boolean = this.isBlockNeeded(withTreeNode);

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
                if (isBlockNeeded) {
                    let rangeOfBlockNode: vscode.Range = DocumentUtils.trimRange(withDocument, TextRangeExt.createVSCodeRange(blockTreeNode.fullSpan));
                    let rangeOfWithOnly: vscode.Range = new vscode.Range(rangeOfWithNode.start, rangeOfBlockNode.start);
                    if (rangeOfWithOnly.start.line === rangeOfWithOnly.end.line) {
                        editToDeleteWithStatements.delete(withDocument.uri, rangeOfWithOnly);
                    } else {
                        let contentOfBlock: string = withDocument.getText(rangeOfBlockNode);
                        if (rangeOfWithNode.start.line !== rangeOfBlockNode.start.line && rangeOfWithNode.start.character < rangeOfBlockNode.start.character) {
                            let indentToDecrease = rangeOfBlockNode.start.character - rangeOfWithNode.start.character;
                            contentOfBlock = this.fixIndentOfContent(indentToDecrease, contentOfBlock);
                        }
                        editToDeleteWithStatements.replace(withDocument.uri, rangeOfWithNode, contentOfBlock.trimLeft());
                    }
                } else {
                    if (rangeOfWithNode.start.line !== rangeOfFirstNode.start.line && rangeOfWithNode.start.character < rangeOfFirstNode.start.character) {
                        let indentToDecrease = rangeOfFirstNode.start.character - rangeOfWithNode.start.character;
                        contentOfBody = this.fixIndentOfContent(indentToDecrease, contentOfBody);
                    }
                    editToDeleteWithStatements.replace(withDocument.uri, rangeOfWithNode, contentOfBody.trimLeft());
                }
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
    isBlockNeeded(withTreeNode: ALFullSyntaxTreeNode): Boolean {
        let parentTreeNode: ALFullSyntaxTreeNode | undefined = withTreeNode.parentNode;
        if (!parentTreeNode || !parentTreeNode.kind || !parentTreeNode.childNodes) {
            throw new Error('WithStatement has to have a parent node.');
        }
        let indexOfWithTreeNode: number = ALFullSyntaxTreeNodeExt.getPathToTreeNode(parentTreeNode, withTreeNode)[0];
        switch (parentTreeNode.kind) {
            case FullSyntaxTreeNodeKind.getCaseLine():
            case FullSyntaxTreeNodeKind.getCaseElse():
                //last entry (ValueSet 1 to n-1, Statement)
                return parentTreeNode.childNodes.length - 1 === indexOfWithTreeNode;
            case FullSyntaxTreeNodeKind.getIfStatement():
                //2nd and 3rd entry (if-expression, if statement, else statement)
                return indexOfWithTreeNode !== 0;
            case FullSyntaxTreeNodeKind.getForStatement():
                //last entry (ControlVariable, StartNumber, EndNumber, Statement)
                return parentTreeNode.childNodes.length - 1 === indexOfWithTreeNode;
            case FullSyntaxTreeNodeKind.getForEachStatement():
                //last entry (Element, List, Statement)
                return parentTreeNode.childNodes.length - 1 === indexOfWithTreeNode;
            case FullSyntaxTreeNodeKind.getWhileStatement():
                //last entry (Expression, Statement)
                return parentTreeNode.childNodes.length - 1 === indexOfWithTreeNode;
            case FullSyntaxTreeNodeKind.getWithStatement():
                //last entry (Identifier, Statement)
                return parentTreeNode.childNodes.length - 1 === indexOfWithTreeNode;
            default:
                return false;
        }
    }

    fixIndentOfContent(indentToFix: number, content: string): string {
        content = '\r\n' + content;
        let regExp: RegExp = new RegExp("\\r\\n[ ]{0," + indentToFix + "}", 'g');
        content = content.replace(regExp, '\r\n');
        return content.substr('\r\n'.length); //delete \r\n again
    }

    private async fixWithTreeNode(withTreeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument, edit: vscode.WorkspaceEdit) {
        let nameOfWithStatement: string = this.getNameOfWithStatement(withTreeNode, document);
        let typeOfWithStatement: string = await this.getTypeOfWithStatement(withTreeNode, document);
        typeOfWithStatement = typeOfWithStatement.replace(/^(.*) temporary$/, '$1');

        let locationOfWithObject: vscode.Location | undefined = await this.getLocationOfObject(document, withTreeNode);
        if (!locationOfWithObject) {
            return;
        }

        await this.checkAndFixIdentifierTreeNodesOfWith(document, withTreeNode, locationOfWithObject, nameOfWithStatement, typeOfWithStatement, edit);
    }
    private async checkAndFixIdentifierTreeNodesOfWith(document: vscode.TextDocument, withTreeNode: ALFullSyntaxTreeNode, locationOfWithObject: vscode.Location, nameOfWithStatement: string, typeOfWithStatement: string, edit: vscode.WorkspaceEdit) {
        let identifierNodesToTest: ALFullSyntaxTreeNode[] = [];
        if (withTreeNode.childNodes && withTreeNode.childNodes.length === 2) {
            ALFullSyntaxTreeNodeExt.collectChildNodes(withTreeNode.childNodes[1], FullSyntaxTreeNodeKind.getIdentifierName(), true, identifierNodesToTest);
            for (let i = 0; i < identifierNodesToTest.length; i++) {
                await this.checkAndFixIdentifierTreeNodeOfWith(identifierNodesToTest[i], document, locationOfWithObject, typeOfWithStatement, edit, nameOfWithStatement);
            }
        }
    }
    async getLocationOfObject(document: vscode.TextDocument, withTreeNode: ALFullSyntaxTreeNode): Promise<vscode.Location | undefined> {
        if (!withTreeNode.childNodes) {
            return;
        }
        let withIdentifierNode: ALFullSyntaxTreeNode = withTreeNode.childNodes[0];
        let withIdentifierRange: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(withIdentifierNode.fullSpan));
        let variableDeclarationOfWithIdentifier: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, withIdentifierRange.start);
        if (variableDeclarationOfWithIdentifier && variableDeclarationOfWithIdentifier.length > 0) {
            let objectLocation: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, variableDeclarationOfWithIdentifier[0].range.start);
            if (objectLocation && objectLocation.length > 0) {
                //A Notification references on itself for example as it does not have a declaration object
                let sameReference: boolean = variableDeclarationOfWithIdentifier[0].uri.fsPath === objectLocation[0].uri.fsPath && variableDeclarationOfWithIdentifier[0].range.isEqual(objectLocation[0].range);
                if (!sameReference) {
                    let objectDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(objectLocation[0].uri);
                    let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(objectDocument);
                    let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, objectLocation[0].range.start);
                    if (objectTreeNode) {
                        return new vscode.Location(objectDocument.uri, TextRangeExt.createVSCodeRange(objectTreeNode.fullSpan));
                    }
                }
            }
        }
        if (['rec', 'xrec'].includes(document.getText(withIdentifierRange).toLowerCase())) {
            // let location: vscode.Location | undefined = this.getLocationOfObjectOfRec(document, withIdentifierRange.start);
            // leave this out as it get's hard on page and tables
        }
        return undefined;
    }
    async getLocationOfObjectOfRec(document: vscode.TextDocument, start: vscode.Position): Promise<vscode.Location | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, start);
        if (!objectTreeNode || !objectTreeNode.kind) {
            return;
        }
        switch (objectTreeNode.kind) {
            case FullSyntaxTreeNodeKind.getTableObject():
                return new vscode.Location(document.uri, TextRangeExt.createVSCodeRange(objectTreeNode.fullSpan));
        }
    }
    private async checkAndFixIdentifierTreeNodeOfWith(identifierNode: ALFullSyntaxTreeNode, document: vscode.TextDocument, locationOfWithObject: vscode.Location, typeOfWithStatement: string, edit: vscode.WorkspaceEdit, nameOfWithStatement: string) {
        let skipIdentifier: boolean = await this.checkIsIdentifierToSkip(document, identifierNode);
        if (!skipIdentifier) {
            let range: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierNode.fullSpan));
            let destinationOfIdentifier: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, range.start);
            if (destinationOfIdentifier && destinationOfIdentifier.length > 0) {
                let referencesToObjectOfWith: boolean = locationOfWithObject.uri.fsPath === destinationOfIdentifier[0].uri.fsPath && locationOfWithObject.range.contains(destinationOfIdentifier[0].range);
                if (referencesToObjectOfWith) {
                    if (!await this.isPartOfSystemFunctionProcedureCallWhichExpectsFields(document, identifierNode)) {
                        if (!this.isReferencingLocalProcedure(document, destinationOfIdentifier[0].uri, destinationOfIdentifier[0].range))
                            edit.insert(document.uri, range.start, nameOfWithStatement + '.');
                    }
                } else if (document.uri.fsPath !== destinationOfIdentifier[0].uri.fsPath) {
                    //check if table or page extension
                    let referencesToExtensionOfObjectOfWith: boolean = await this.isTableOrPageExtensionOfObjectOfWith(destinationOfIdentifier, document, range, locationOfWithObject, identifierNode, edit, nameOfWithStatement);
                    if (referencesToExtensionOfObjectOfWith) {
                        if (!await this.isPartOfSystemFunctionProcedureCallWhichExpectsFields(document, identifierNode)) {
                            edit.insert(document.uri, range.start, nameOfWithStatement + '.');
                        }
                    }
                }
            }
            else {
                this.fixIfSystemFunction(document, range, typeOfWithStatement, edit, nameOfWithStatement);
            }
        }
    }
    isReferencingLocalProcedure(documentOfWith: vscode.TextDocument, uri: vscode.Uri, range: vscode.Range): boolean {
        if (documentOfWith.uri.fsPath !== uri.fsPath) {
            return false;
        }
        if (documentOfWith.lineAt(range.start.line).text.toLowerCase().trimLeft().startsWith('local procedure')) {
            return true;
        }
        return false;
    }

    private async isTableOrPageExtensionOfObjectOfWith(destinationOfIdentifier: vscode.Location[], document: vscode.TextDocument, range: vscode.Range, locationOfWithObject: vscode.Location, identifierNode: ALFullSyntaxTreeNode, edit: vscode.WorkspaceEdit, nameOfWithStatement: string): Promise<boolean> {
        // let fileContent: string = fs.readFileSync(destinationOfIdentifier[0].uri.fsPath, { encoding: 'utf-8', flag: 'r' });
        // let fileContentBuffer: string | Buffer = fs.readFileSync(destinationOfIdentifier[0].uri.fsPath, { encoding: 'utf-8', flag: 'r' });
        let documentOfIdentifierToTest: vscode.TextDocument = await vscode.workspace.openTextDocument(destinationOfIdentifier[0].uri);
        for (let i = destinationOfIdentifier[0].range.start.line; i >= 0; i--) {
            let line: string = documentOfIdentifierToTest.lineAt(i).text;
            let matchArr: RegExpMatchArray | null = line.match(/(^.*(?:table|page)extension\s+\d+\s+.+\sextends\s+)[^\s]+/i);
            if (matchArr) {
                let positionToFindExtendedObject: vscode.Position = new vscode.Position(i, matchArr[1].length);
                let locationOfExtendedObject: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', documentOfIdentifierToTest.uri, positionToFindExtendedObject);
                if (locationOfExtendedObject && locationOfExtendedObject.length > 0) {
                    return locationOfWithObject.uri.fsPath === locationOfExtendedObject[0].uri.fsPath && locationOfWithObject.range.contains(locationOfExtendedObject[0].range);
                }
            }
        }
        return false;
    }

    async checkIsIdentifierToSkip(document: vscode.TextDocument, identifierTreeNode: ALFullSyntaxTreeNode): Promise<boolean> {
        let skip: boolean = this.checkMemberAccessAndOptionAccessExpression(document, identifierTreeNode);
        if (!skip) {
            skip = await this.checkReferencingVariablesOrLocalProcedures(document, identifierTreeNode);
        }
        return skip;
    }
    async checkReferencingVariablesOrLocalProcedures(document: vscode.TextDocument, identifierTreeNode: ALFullSyntaxTreeNode): Promise<boolean> {
        //"Document Type".AsInteger() is for example a MemberAccessExpression, but needs to be handled
        let typeDetective: TypeDetective = new TypeDetective(document, identifierTreeNode);
        await typeDetective.analyzeTypeOfTreeNode();
        let hoverMessageFirstLine: string | undefined = typeDetective.getHoverMessageFirstLine();
        if (hoverMessageFirstLine) {
            switch (true) {
                case hoverMessageFirstLine.trimLeft().startsWith('local procedure'):
                case hoverMessageFirstLine.trimLeft().startsWith('(local)'):
                case hoverMessageFirstLine.trimLeft().startsWith('(global)'):
                case hoverMessageFirstLine.trimLeft().startsWith('(parameter)'):
                    return true;
            }
        }
        return false;
    }
    checkMemberAccessAndOptionAccessExpression(document: vscode.TextDocument, identifierTreeNode: ALFullSyntaxTreeNode): boolean {
        let parentNode: ALFullSyntaxTreeNode | undefined = identifierTreeNode.parentNode;
        if (parentNode && parentNode.kind && parentNode.childNodes) {
            if (parentNode.kind === FullSyntaxTreeNodeKind.getMemberAccessExpression()) {
                let indexOfIdentifier: number = ALFullSyntaxTreeNodeExt.getPathToTreeNode(parentNode, identifierTreeNode)[0];
                if (indexOfIdentifier === 1) {
                    return true;
                }
            }
            if (parentNode.kind === FullSyntaxTreeNodeKind.getOptionAccessExpression()) {
                let indexOfIdentifier: number = ALFullSyntaxTreeNodeExt.getPathToTreeNode(parentNode, identifierTreeNode)[0];
                if (indexOfIdentifier === 1) {
                    return true;
                } else {
                    return this.checkMemberAccessAndOptionAccessExpression(document, parentNode);
                }
            }
        }
        return false;
    }
    private fixIfSystemFunction(document: vscode.TextDocument, range: vscode.Range, typeOfWithStatement: string, edit: vscode.WorkspaceEdit, nameOfWithStatement: string) {
        let identifierText: string = document.getText(range);
        if (this.isIdentifierSystemFunction(identifierText, typeOfWithStatement)) {
            let alreadyFixedFromInnerWith = edit.get(document.uri).some(textEdit => textEdit.range.start.isEqual(range.start));
            if (!alreadyFixedFromInnerWith) {
                edit.insert(document.uri, range.start, nameOfWithStatement + '.');
            }
        }
    }

    // private async fixIfSameUri(identifierNode: ALFullSyntaxTreeNode, locationOfIdentifier: vscode.Location, typeOfWithStatement: string, edit: vscode.WorkspaceEdit, document: vscode.TextDocument, range: vscode.Range, nameOfWithStatement: string) {
    //     //TODO: Same URI is not enough. Has to be the same object - Location?
    //     let otherDocument: vscode.TextDocument | undefined = await vscode.workspace.openTextDocument(locationOfIdentifier.uri);
    //     if (!otherDocument) {
    //         return;
    //     }
    //     let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(otherDocument);
    //     let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, locationOfIdentifier.range.start);
    //     if (!objectTreeNode) {
    //         return;
    //     }

    //     if ((objectTreeNode.kind === FullSyntaxTreeNodeKind.getTableExtensionObject() ||
    //         objectTreeNode.kind === FullSyntaxTreeNodeKind.getPageExtensionObject()) && objectTreeNode.childNodes &&
    //         objectTreeNode.childNodes[2].kind === FullSyntaxTreeNodeKind.getObjectReference()) {
    //         let rangeOfObjectReference: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(objectTreeNode.childNodes[2].fullSpan));
    //         let alObject: ALObject = new ALObject(document.getText(rangeOfObjectReference), 'table', 0, otherDocument.uri);
    //         if (typeOfWithStatement.toLowerCase().trim() === alObject.getTypeString().toLowerCase().trim()) {
    //             urisLeadingToDestination.push(locationOfIdentifier.uri);
    //         }
    //     } else {
    //         let alObject: ALObject = ALObjectParser.parseObjectTreeNodeToALObject(otherDocument, objectTreeNode);
    //         if (typeOfWithStatement.toLowerCase().trim() === alObject.getTypeString().toLowerCase().trim()) {
    //             urisLeadingToDestination.push(locationOfIdentifier.uri);
    //         }
    //     }

    //     if (urisLeadingToDestination.includes(locationOfIdentifier.uri)) {
    //         if (!await this.isPartOfSystemFunctionProcedureCall(document, identifierNode)) {
    //             edit.insert(document.uri, range.start, nameOfWithStatement + '.');
    //         }
    //     }
    // }
    async isPartOfSystemFunctionProcedureCallWhichExpectsFields(document: vscode.TextDocument, identifierNode: ALFullSyntaxTreeNode): Promise<boolean> {
        if (identifierNode.parentNode && identifierNode.parentNode.kind === FullSyntaxTreeNodeKind.getArgumentList()) {
            let argumentListTreeNode: ALFullSyntaxTreeNode = identifierNode.parentNode;
            if (argumentListTreeNode && argumentListTreeNode.parentNode) {
                let indexOfIdentifier: number = ALFullSyntaxTreeNodeExt.getPathToTreeNode(argumentListTreeNode, identifierNode)[0];
                let parentNodeOfArgumentList: ALFullSyntaxTreeNode = argumentListTreeNode.parentNode;
                if (parentNodeOfArgumentList.kind === FullSyntaxTreeNodeKind.getInvocationExpression() && parentNodeOfArgumentList.childNodes) {
                    let memberOrIdentifierNode: ALFullSyntaxTreeNode = parentNodeOfArgumentList.childNodes[0];
                    let procedureIdentifierNode: ALFullSyntaxTreeNode;
                    if (memberOrIdentifierNode.kind === FullSyntaxTreeNodeKind.getMemberAccessExpression() && memberOrIdentifierNode.childNodes) {
                        procedureIdentifierNode = memberOrIdentifierNode.childNodes[1];
                    } else {
                        procedureIdentifierNode = memberOrIdentifierNode;
                    }
                    let rangeOfProcedureIdentifier: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(procedureIdentifierNode.fullSpan));
                    let identifierText: string = document.getText(rangeOfProcedureIdentifier);
                    let proceduresWhereFirstParameterExpectsField: string[] = [
                        'copyfilter',
                        'fieldactive',
                        'fieldcaption',
                        'fielderror',
                        'fieldname',
                        'fieldno',
                        'getascending',
                        'getfilter',
                        'getrangemax',
                        'getrangemin',
                        'modifyall',
                        'relation',
                        'setascending',
                        'setfilter',
                        'setrange',
                        'testfield',
                        'validate'
                    ];
                    let proceduresWhereAllParametersExpectFields: string[] = [
                        'calcfields',
                        'calcsums',
                        'setautocalcfields',
                        'setcurrentkey'
                    ];
                    if ((proceduresWhereFirstParameterExpectsField.includes(identifierText.toLowerCase().trim()) && indexOfIdentifier === 0) ||
                        proceduresWhereAllParametersExpectFields.includes(identifierText.toLowerCase().trim())) {
                        let destinationOfProcedureCall: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, rangeOfProcedureIdentifier.start);
                        if (!destinationOfProcedureCall || destinationOfProcedureCall.length === 0) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
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
        } else if (typeTrimmed.startsWith('query')) {
            systemFunctions = ALSystemFunctions.getSystemFunctionsOfQuery;
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
        await typeDetective.analyzeTypeOfTreeNode();
        return typeDetective.getType();
    }
    getNoOfDocsFixed(): number {
        return this.noOfDocsFixed;
    }
    getNoOfUsagesFixed(): number {
        return this.noOfUsagesFixed;
    }

    async startDiagnosticWatcher(withDocument: WithDocument, diagnosticsBeforeApplyEdit: vscode.Diagnostic[]): Promise<boolean> {
        let changed: boolean = false;
        let finished: boolean = false;
        do {
            let currentDiagnostics = withDocument.getAL0606Warnings();
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