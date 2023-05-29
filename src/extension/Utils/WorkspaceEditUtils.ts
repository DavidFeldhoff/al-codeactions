import { Position, Range, TextDocument, TextEdit, TextEditor, TextEditorEdit, window, workspace, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { ALVariable } from "../Entities/alVariable";
import { DocumentUtils } from "./documentUtils";

export class WorkspaceEditUtils {
    public static async applyWorkspaceEditWithoutUndoStack(workspaceEdit: WorkspaceEdit): Promise<boolean> {
        let successful: boolean = true;
        for (const entry of workspaceEdit.entries()) {
            let textEditor: TextEditor | undefined = window.visibleTextEditors.find((textEditor) => textEditor.document.uri.fsPath == entry[0].fsPath)
            if (!textEditor) {
                let doc: TextDocument | undefined = workspace.textDocuments.find((document) => document.uri.fsPath == entry[0].fsPath)
                if (!doc)
                    doc = await workspace.openTextDocument(entry[0])
                textEditor = await window.showTextDocument(doc, undefined, true)
            }
            const textEdits = entry[1]
            const textEditsSorted = textEdits.sort((a, b) => b.range.end.compareTo(a.range.end))
            let successfulTemp: boolean
            for (const textEdit of textEditsSorted) {
                successfulTemp = await textEditor.edit((editBuilder: TextEditorEdit) => {
                    if (textEdit.range.start.compareTo(textEdit.range.end) == 0)
                        editBuilder.insert(textEdit.range.start, textEdit.newText)
                    else
                        editBuilder.replace(textEdit.range, textEdit.newText)
                }, { undoStopBefore: false, undoStopAfter: false })
                if (!successfulTemp)
                    successful = false
            }
        }
        return successful;
    }
    static addVariableToLocalVarSection(methodOrTriggerTreeNode: ALFullSyntaxTreeNode, variable: ALVariable, document: TextDocument) {
        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        let textEdit: TextEdit;
        if (varSection) {
            textEdit = WorkspaceEditUtils.addVariableToExistingVarSection(varSection, document, variable);
        } else {
            textEdit = WorkspaceEditUtils.addVariableAndLocalVarSection(methodOrTriggerTreeNode, document, variable);
        }
        return textEdit;
    }
    public static addVariableToGlobalVarSection(documentNode: ALFullSyntaxTreeNode, variable: ALVariable, document: TextDocument): TextEdit {
        let globalVarSections: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(documentNode, FullSyntaxTreeNodeKind.getGlobalVarSection(), false, globalVarSections);
        let textEdit: TextEdit;
        if (globalVarSections.length > 0) {
            textEdit = WorkspaceEditUtils.addVariableToExistingVarSection(globalVarSections[0], document, variable);
        } else {
            textEdit = WorkspaceEditUtils.addVariableAndGlobalVarSection(documentNode, document, variable);
        }
        return textEdit;
    }
    public static removeVariable(document: TextDocument, variableDeclarationNode: ALFullSyntaxTreeNode, edit: WorkspaceEdit) {
        switch (variableDeclarationNode.kind) {
            case FullSyntaxTreeNodeKind.getVariableDeclaration():
                this.removeVariableOfVariableDeclaration(document, variableDeclarationNode, edit);
                break;
            case FullSyntaxTreeNodeKind.getVariableDeclarationName():
                this.removeVariableOfVariableListDeclaration(document, variableDeclarationNode, edit);
                break;
        }
    }
    private static removeVariableOfVariableDeclaration(document: TextDocument, variableDeclarationNode: ALFullSyntaxTreeNode, edit: WorkspaceEdit) {
        let varSection: ALFullSyntaxTreeNode = variableDeclarationNode.parentNode!
        if (varSection.childNodes!.length == 1)
            edit.delete(document.uri, TextRangeExt.createVSCodeRange(varSection.fullSpan))
        else
            edit.delete(document.uri, TextRangeExt.createVSCodeRange(variableDeclarationNode.fullSpan));
    }

    private static removeVariableOfVariableListDeclaration(document: TextDocument, variableDeclarationNode: ALFullSyntaxTreeNode, edit: WorkspaceEdit) {
        let variableDeclarationNameNode: ALFullSyntaxTreeNode = variableDeclarationNode;
        let variableDeclarationListNode: ALFullSyntaxTreeNode = variableDeclarationNameNode.parentNode!;
        let firstDeclarationNameNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(variableDeclarationListNode, FullSyntaxTreeNodeKind.getVariableDeclarationName(), false)!;
        let indexOfFirstNode: number = ALFullSyntaxTreeNodeExt.getPathToTreeNode(variableDeclarationListNode, firstDeclarationNameNode)[0];
        let indexOfCurrentNode: number = ALFullSyntaxTreeNodeExt.getPathToTreeNode(variableDeclarationListNode, variableDeclarationNameNode)[0];
        let rangeOfCurrentNode: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(variableDeclarationNameNode.fullSpan));

        if (indexOfCurrentNode == indexOfFirstNode) {
            let rangeOfNextNode: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(variableDeclarationListNode.childNodes![indexOfCurrentNode + 1].fullSpan));
            edit.delete(document.uri, new Range(rangeOfCurrentNode.start, rangeOfNextNode.start));
        } else {
            let rangeOfPreviousNode: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(variableDeclarationListNode.childNodes![indexOfCurrentNode - 1].fullSpan));
            edit.delete(document.uri, new Range(rangeOfPreviousNode.end, rangeOfCurrentNode.end));
        }
    }
    private static addVariableToExistingVarSection(varSection: ALFullSyntaxTreeNode, document: TextDocument, variable: ALVariable): TextEdit {
        let rangeOfVarSection: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(varSection.fullSpan));
        let indent: string = ''.padStart(rangeOfVarSection.start.character + 4, ' ');
        const eol = DocumentUtils.getEolByTextDocument(document);
        let textToInsert: string = variable.getVariableDeclarationString(eol, indent) + ';' + eol;

        let positionToAdd: Position = WorkspaceEditUtils.getPositionToAddVariable(variable, document, varSection);
        let textEdit: TextEdit = new TextEdit(new Range(positionToAdd, positionToAdd), textToInsert);
        return textEdit;
    }
    private static addVariableAndLocalVarSection(methodOrTriggerTreeNode: ALFullSyntaxTreeNode, document: TextDocument, variable: ALVariable): TextEdit {
        let positionToAdd: Position = WorkspaceEditUtils.getPositionToAddLocalVarSection(methodOrTriggerTreeNode, document);
        let rangeOfMethodOrTrigger: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(methodOrTriggerTreeNode.fullSpan));
        let indent: string = ''.padStart(rangeOfMethodOrTrigger.start.character, ' ')
        const eol = DocumentUtils.getEolByTextDocument(document);
        let textToInsert: string = indent + 'var' + eol;
        textToInsert += variable.getVariableDeclarationString(eol, indent.padStart(indent.length + 4, ' ')) + ';' + eol;
        let textEdit: TextEdit = new TextEdit(new Range(positionToAdd, positionToAdd), textToInsert);
        return textEdit;
    }
    private static addVariableAndGlobalVarSection(documentNode: ALFullSyntaxTreeNode, document: TextDocument, variable: ALVariable): TextEdit {
        let positionToAdd: Position = WorkspaceEditUtils.getPositionToAddGlobalVarSection(documentNode, document);
        let indent: string = ''.padStart(4, ' ')
        if (documentNode.kind == FullSyntaxTreeNodeKind.getRequestPage()) {
            indent = ''.padStart(8, ' ')
        }
        const eol = DocumentUtils.getEolByTextDocument(document);
        let textToInsert: string = indent + 'var' + eol;
        textToInsert += variable.getVariableDeclarationString(eol, ''.padStart(indent.length + 4, ' ')) + ';' + eol + eol;
        let textEdit: TextEdit = new TextEdit(new Range(positionToAdd, positionToAdd), textToInsert);
        return textEdit;
    }
    static getPositionToAddLocalVarSection(methodOrTriggerTreeNode: ALFullSyntaxTreeNode, document: TextDocument): Position {
        let blockNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false)!;
        let blockRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(blockNode.fullSpan));
        return new Position(blockRange.start.line, 0);
    }
    private static getPositionToAddGlobalVarSection(documentNode: ALFullSyntaxTreeNode, document: TextDocument) {
        let methodNodes: ALFullSyntaxTreeNode[] = [];

        ALFullSyntaxTreeNodeExt.collectChildNodes(documentNode, FullSyntaxTreeNodeKind.getMethodDeclaration(), false, methodNodes);
        let positionToAdd: Position;
        if (methodNodes.length == 0) {
            let documentRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(documentNode.fullSpan));
            positionToAdd = new Position(documentRange.end.line, 0);
        } else {
            let methodRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(methodNodes[0].fullSpan));
            positionToAdd = new Position(methodRange.start.line, 0);
        }
        return positionToAdd;
    }

    private static getPositionToAddVariable(variable: ALVariable, document: TextDocument, varSection: ALFullSyntaxTreeNode): Position {
        let variableDeclarationNodes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableDeclaration(), false, variableDeclarationNodes);
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableListDeclaration(), false, variableDeclarationNodes);
        let categorizedVariableNodes: { type: string; node: ALFullSyntaxTreeNode; }[] = this.categorizeVariableNodes(variableDeclarationNodes, document);

        let lastIndexOfSameType: number | undefined;
        let lastIndexOfTypeWithHigherPriority: number | undefined;
        let typePriorities: string[] = [
            'record',
            'report',
            'codeunit',
            'xmlport',
            'page',
            'query',
            'notification',
            'bigtext',
            'dateformula',
            'recordid',
            'recordref',
            'fieldref',
            'filterpagebuilder'
        ];
        let variableType: string = variable.getTypeShort().toLowerCase();
        let indexVariable: number = typePriorities.indexOf(variableType);
        for (let i = 0; i < categorizedVariableNodes.length; i++) {
            let currentType = categorizedVariableNodes[i].type.toLowerCase();
            if (currentType == variableType) {
                lastIndexOfSameType = i;
            } else {
                let indexCurrentType: number = typePriorities.indexOf(currentType);
                if (indexCurrentType >= 0 && (indexCurrentType < indexVariable || indexVariable == -1))
                    lastIndexOfTypeWithHigherPriority = i;
            }
        }
        let positionToAdd: Position;
        if (lastIndexOfSameType !== undefined) {
            let rangeOfNode: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(categorizedVariableNodes[lastIndexOfSameType].node.fullSpan))
            positionToAdd = new Position(rangeOfNode.end.line + 1, 0);
        } else if (lastIndexOfTypeWithHigherPriority !== undefined) {
            let rangeOfNode: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(categorizedVariableNodes[lastIndexOfTypeWithHigherPriority].node.fullSpan))
            positionToAdd = new Position(rangeOfNode.end.line + 1, 0);
        } else if (variableDeclarationNodes.length > 0) {
            let rangeOfFirstNode: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(varSection.childNodes![0].fullSpan))
            positionToAdd = new Position(rangeOfFirstNode.start.line, 0);
        } else {
            let rangeOfVarSection: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(varSection.fullSpan));
            positionToAdd = new Position(rangeOfVarSection.end.line + 1, 0);
        }
        return positionToAdd;
    }

    private static categorizeVariableNodes(variableDeclarationNodes: ALFullSyntaxTreeNode[], document: TextDocument): { type: string; node: ALFullSyntaxTreeNode; }[] {
        let typeInfos: { type: string, node: ALFullSyntaxTreeNode }[] = []
        for (const node of variableDeclarationNodes) {
            let typeInfo = this.getTypeInfoOfVariableDeclaration(node, document)
            typeInfos.push({ type: typeInfo.typeShort, node: node })
        }
        return typeInfos;
    }
    private static getTypeInfoOfVariableDeclaration(variableDeclarationNode: ALFullSyntaxTreeNode, document: TextDocument): { typeFull: string, typeShort: string } {
        let mainNode: ALFullSyntaxTreeNode = variableDeclarationNode
        if (variableDeclarationNode.parentNode!.kind == FullSyntaxTreeNodeKind.getVariableListDeclaration())
            mainNode = variableDeclarationNode.parentNode!

        let typeNode: ALFullSyntaxTreeNode = mainNode.childNodes![mainNode.childNodes!.length - 1]
        let typeFull: string = document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeNode.fullSpan)));
        let typeShort: string = typeFull.split(' ')[0].split('[')[0]
        return { typeFull, typeShort }
    }
}