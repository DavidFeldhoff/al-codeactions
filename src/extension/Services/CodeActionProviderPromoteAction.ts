import { CodeAction, CodeActionKind, Position, Range, Selection, SnippetString, TextDocument, TextEditor, TextEditorRevealType, TreeItemCollapsibleState, ViewColumn, window, workspace, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { Command } from "../Entities/Command";
import { DocumentUtils } from "../Utils/documentUtils";
import { ICodeActionProvider } from "./ICodeActionProvider";

export class CodeActionProviderPromoteAction implements ICodeActionProvider {
    document: TextDocument;
    range: Range;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(): Promise<boolean> {
        const syntaxTree = await SyntaxTree.getInstance(this.document);
        const currentPageActionName = this.getCurrentPageActionName(syntaxTree);
        if (!currentPageActionName)
            return false;
        if (this.checkIfCurrentActionIsAlreadyPromotedAsActionRef(currentPageActionName, syntaxTree))
            return false;
        if (this.checkIfPromotedPropertyOnActionsExist(syntaxTree))
            return false;
        return true;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        const codeAction = new CodeAction('Promote action', CodeActionKind.QuickFix);
        codeAction.command = {
            command: Command.promoteAction,
            title: 'Promote action',
            arguments: [this.document, this.range]
        }
        return [codeAction];
    }
    async runCommand(): Promise<void> {
        const syntaxTree = await SyntaxTree.getInstance(this.document);
        const currentPageActionName = this.getCurrentPageActionName(syntaxTree)!;
        const usersTextEditor = window.activeTextEditor!
        const pageExtensionNode = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), this.range.start, [FullSyntaxTreeNodeKind.getPageExtensionObject()])
        if (pageExtensionNode) {
            const locationOfBasePage = await ALFullSyntaxTreeNodeExt.getExtendedObjectLocation(this.document, pageExtensionNode);
            if (locationOfBasePage) {
                let extendedObjectDoc: TextDocument = await workspace.openTextDocument(locationOfBasePage.uri);
                const textEditorOfBaseDoc = await window.showTextDocument(extendedObjectDoc, ViewColumn.Beside)
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(extendedObjectDoc);
                const pageNode = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), locationOfBasePage.range.start, [FullSyntaxTreeNodeKind.getPageObject()]);
                if (pageNode) {
                    const actionAreaNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(pageNode, [FullSyntaxTreeNodeKind.getPageActionArea()], true)
                    const promotedActionArea = actionAreaNodes.find(node => node.name && node.name.toLowerCase() == 'promoted')
                    if (!promotedActionArea) {
                        window.showErrorMessage('The base page does not have a promoted action area, therefore it cannot be promoted on this page extension.')
                        return;
                    } else {
                        const pageExtensionActionListNodes = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(pageExtensionNode, FullSyntaxTreeNodeKind.getPageExtensionActionList(), true)!
                        const { aborted, chosenNode } = await this.askIfActionShouldBePromotedToExistingNode(usersTextEditor, textEditorOfBaseDoc, promotedActionArea)
                        if (aborted)
                            return
                        if (chosenNode)
                            // hier muss ein actionref gemacht werden. also addlast(Category_Process). Wenn der noch nicht da ist, anlegen. Ggf. sogar addlast(Promoted){ addlast(Category_Process}
                            this.addToAddLastOfActionGroup(currentPageActionName, chosenNode, pageExtensionActionListNodes);
                        else
                            this.addToAddLastOfPromotedActionArea(currentPageActionName, promotedActionArea);
                        return;
                    }
                }
            }
        }
        const actionAreaNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(syntaxTree.getRoot(), [FullSyntaxTreeNodeKind.getPageActionArea()], true)
        const promotedActionArea = actionAreaNodes.find(node => node.name && node.name.toLowerCase() == 'promoted')
        if (promotedActionArea) {
            const { aborted, chosenNode } = await this.askIfActionShouldBePromotedToExistingNode(usersTextEditor, usersTextEditor, promotedActionArea)
            if (aborted)
                return
            if (chosenNode)
                this.addToEndOfActionGroup(currentPageActionName, chosenNode);
            else
                this.addToEndOfPromotedActionArea(currentPageActionName, promotedActionArea);
        } else
            this.addPromotedActionAreaAfterNormalActionArea(currentPageActionName, actionAreaNodes.pop()!)
    }
    private async askIfActionShouldBePromotedToExistingNode(usersTextEditor: TextEditor, textEditorOfBaseDoc: TextEditor, promotedActionArea: ALFullSyntaxTreeNode) {
        const pageActionGroupNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(promotedActionArea, [FullSyntaxTreeNodeKind.getPageActionGroup()], false)
        if (pageActionGroupNodes.length == 0)
            return { aborted: false, chosenNode: undefined }
        interface myPick { label: string, range: Range, node: ALFullSyntaxTreeNode | undefined }
        const items: myPick[] = pageActionGroupNodes.map(pageActionGroupNode => {
            return {
                label: pageActionGroupNode.name!,
                range: DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageActionGroupNode.fullSpan)),
                node: pageActionGroupNode
            }
        })
        const newGroupLbl = 'Create new action group...';
        const rangeOfNewGroup = new Range(items[items.length - 1].range!.end, items[items.length - 1].range!.end)
        items.push({ label: newGroupLbl, node: undefined, range: rangeOfNewGroup })
        const selectionSave = usersTextEditor.selection;
        const pickedItem: myPick | undefined = await window.showQuickPick(items, {
            canPickMany: false,
            title: 'To which action group should it be promoted?',
            onDidSelectItem(item: myPick) {
                textEditorOfBaseDoc.revealRange(item.range, TextEditorRevealType.InCenter)
                textEditorOfBaseDoc.selection = new Selection(item.range.start, item.range.end);
            },
        })
        await window.showTextDocument(this.document);
        usersTextEditor.selection = selectionSave;
        if (!pickedItem)
            return { aborted: true, chosenNode: undefined }
        if (pickedItem.label != newGroupLbl && pickedItem.node)
            return { aborted: false, chosenNode: pickedItem.node }
        return { aborted: false, chosenNode: undefined }
    }

    private async addToEndOfActionGroup(pageActionNameToPromote: string, actionGroupNode: ALFullSyntaxTreeNode) {
        const { textToInsert, newLines } = this.getTextToInsert(false, false, pageActionNameToPromote, actionGroupNode);
        const actionGroupRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(actionGroupNode.fullSpan));

        const edit = new WorkspaceEdit();
        const lineToInsert = actionGroupRange.end.line
        edit.insert(this.document.uri, new Position(lineToInsert, 0), textToInsert);
        await workspace.applyEdit(edit);
        this.revealRange(lineToInsert, newLines)
    }
    private async addToEndOfPromotedActionArea(pageActionNameToPromote: string, promotedActionArea: ALFullSyntaxTreeNode) {
        const { textToInsert, newLines } = this.getTextToInsert(false, true, pageActionNameToPromote, promotedActionArea)
        const promotedActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(promotedActionArea.fullSpan));
        const snippetString = new SnippetString(textToInsert);
        const lineToInsert = promotedActionAreaRange.end.line
        await window.activeTextEditor!.insertSnippet(snippetString, new Position(lineToInsert, 0));
        this.revealRange(lineToInsert, newLines)
    }
    private async addPromotedActionAreaAfterNormalActionArea(pageActionNameToPromote: string, normalPageActionAreaNode: ALFullSyntaxTreeNode) {
        const pageActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(normalPageActionAreaNode.fullSpan));
        const { textToInsert, newLines } = this.getTextToInsert(true, true, pageActionNameToPromote, normalPageActionAreaNode)
        const snippetString = new SnippetString(textToInsert);
        const lineToInsert = pageActionAreaRange.end.line + 1
        await window.activeTextEditor!.insertSnippet(snippetString, new Position(lineToInsert, 0));
        this.revealRange(lineToInsert, newLines)
    }
    private async addToAddLastOfActionGroup(pageActionNameToPromote: string, anchorActionGroupNode: ALFullSyntaxTreeNode, pageExtensionActionListNode: ALFullSyntaxTreeNode) {
        const actionAddChangeNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(pageExtensionActionListNode, [FullSyntaxTreeNodeKind.getActionAddChange()], false)
        const addLastToAnchorActionGroupNode = actionAddChangeNodes.find(node => node.ChangeKeyword && node.ChangeKeyword.toLowerCase() == 'addlast' && node.Anchor && node.Anchor.toLowerCase() == anchorActionGroupNode.name!.toLowerCase())

        const { textToInsert, newLines } = this.getTextToInsertToAddLastOfActionGroup(pageActionNameToPromote, anchorActionGroupNode, addLastToAnchorActionGroupNode, pageExtensionActionListNode);
        let lineToInsert
        if (addLastToAnchorActionGroupNode)
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(addLastToAnchorActionGroupNode.fullSpan)).end.line;
        else
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageExtensionActionListNode.fullSpan)).end.line;

        const edit = new WorkspaceEdit();
        edit.insert(this.document.uri, new Position(lineToInsert, 0), textToInsert);
        await workspace.applyEdit(edit);
        this.revealRange(lineToInsert, newLines)
    }
    private async addToAddLastOfPromotedActionArea(pageActionNameToPromote: string, pageExtensionActionListNode: ALFullSyntaxTreeNode) {
        const actionAddChangeNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(pageExtensionActionListNode, [FullSyntaxTreeNodeKind.getActionAddChange()], false)
        const addLastToPromotedNode = actionAddChangeNodes.find(node => node.ChangeKeyword && node.ChangeKeyword.toLowerCase() == 'addlast' && node.Anchor && node.Anchor.toLowerCase() == "promoted")

        const { textToInsert, newLines } = this.getTextToInsertToAddLastOfPromotedActionArea(pageActionNameToPromote, addLastToPromotedNode, pageExtensionActionListNode)
        let lineToInsert
        if (addLastToPromotedNode)
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(addLastToPromotedNode.fullSpan)).end.line
        else
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageExtensionActionListNode.fullSpan)).end.line

        const snippetString = new SnippetString(textToInsert);
        await window.activeTextEditor!.insertSnippet(snippetString, new Position(lineToInsert, 0));
        this.revealRange(lineToInsert, newLines)
    }
    private getTextToInsert(addArea: boolean, addGroup: boolean, pageActionNameToPromote: string, node: ALFullSyntaxTreeNode) {
        const indent = this.getActionsContainerIndent(node);

        let textToInsert: string
        const promotedName = this.getPromotedActionName(pageActionNameToPromote);
        let textToInsertArrActionRef = [
            `actionref(${promotedName}; ${pageActionNameToPromote})`,
            `{`,
            `}`
        ]
        textToInsert = this.indentAndMakeItOneliner(textToInsertArrActionRef, indent + 8)

        if (addGroup) {
            const part1 = [
                `group(Category_\${1})`,
                `{`,
                `    Caption = '\${2:\${1/Category_//}}';`,
                `    `
            ]
            const part2 = [`}`]
            textToInsert = this.indentAndMakeItOneliner(part1, indent + 4) + textToInsert + this.indentAndMakeItOneliner(part2, indent + 4)
        }
        if (addArea) {
            const part1 = [
                `area(Promoted)`,
                `{`
            ]
            const part2 = [`}`]
            textToInsert = this.indentAndMakeItOneliner(part1, indent) + textToInsert + this.indentAndMakeItOneliner(part2, indent)
        }
        const newLines = textToInsert.split("\n").length
        return { textToInsert, newLines }
    }
    private getTextToInsertToAddLastOfActionGroup(pageActionNameToPromote: string, anchorActionGroupNode: ALFullSyntaxTreeNode, addLastToAnchorActionGroupNode: ALFullSyntaxTreeNode | undefined, pageExtensionActionListNode: ALFullSyntaxTreeNode) {
        const indent = this.getActionsContainerIndent(pageExtensionActionListNode);

        let textToInsert: string
        const promotedName = this.getPromotedActionName(pageActionNameToPromote);

        // const appendToExistingGroup = !this.document.getText().split('\n').some(entry => new RegExp(`/^\s+addlast\("?${anchorActionGroupNode.name!.replace(/"(.*)"/, '$1')}"?\)`).test(entry));
        if (addLastToAnchorActionGroupNode) {
            let textToInsertArrActionRef = [
                `actionref(${promotedName}; ${pageActionNameToPromote})`,
                `{`,
                `}`
            ]
            textToInsert = this.indentAndMakeItOneliner(textToInsertArrActionRef, indent + 8)
        } else {
            const part1 = [
                `addlast(${anchorActionGroupNode.name})`,
                `{`,
                `    actionref(${promotedName}; ${pageActionNameToPromote})`,
                `    {`,
                `    }`,
                `}`
            ]
            textToInsert = this.indentAndMakeItOneliner(part1, indent + 4)
        }
        const newLines = textToInsert.split("\n").length
        return { textToInsert, newLines }
    }
    private getTextToInsertToAddLastOfPromotedActionArea(pageActionNameToPromote: string, addLastToPromotedNode: ALFullSyntaxTreeNode | undefined, pageExtensionActionListNode: ALFullSyntaxTreeNode) {
        const indent = this.getActionsContainerIndent(pageExtensionActionListNode);

        let textToInsert: string
        const promotedName = this.getPromotedActionName(pageActionNameToPromote);

        if (addLastToPromotedNode) {
            const part = [
                `group(Category_\${1})`,
                `{`,
                `    Caption = '\${2:\${1/Category_//}}';`,
                `    `,
                `    actionref(${promotedName}; ${pageActionNameToPromote})`,
                `    {`,
                `    }`,
                `}`,
            ]
            textToInsert = this.indentAndMakeItOneliner(part, indent + 4)
        } else {
            const part = [
                `addlast(Promoted)`,
                `{`,
                `    group(Category_\${1})`,
                `    {`,
                `        Caption = '\${2:\${1/Category_//}}';`,
                `        `,
                `        actionref(${promotedName}; ${pageActionNameToPromote})`,
                `        {`,
                `        }`,
                `    }`,
                `}`,
            ]
            textToInsert = this.indentAndMakeItOneliner(part, indent + 4)
        }
        const newLines = textToInsert.split("\n").length
        return { textToInsert, newLines }
    }
    private getActionsContainerIndent(node: ALFullSyntaxTreeNode) {
        let pageActionAreaNode: ALFullSyntaxTreeNode
        const actionContainerKinds = [FullSyntaxTreeNodeKind.getPageActionArea(), FullSyntaxTreeNodeKind.getPageExtensionActionList()]
        if (node.kind && actionContainerKinds.includes(node.kind))
            pageActionAreaNode = node;
        else
            pageActionAreaNode = ALFullSyntaxTreeNodeExt.findParentNodeOfKind(node, actionContainerKinds)!
        const pageActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageActionAreaNode.fullSpan));
        return pageActionAreaRange.start.character
    }
    private revealRange(lineToInsert: number, newLines: number) {
        window.activeTextEditor!.revealRange(new Range(lineToInsert, 0, lineToInsert + newLines, 0), TextEditorRevealType.InCenter)
    }

    private getPromotedActionName(pageActionNameToPromote: string) {
        let promotedName = `${pageActionNameToPromote}_Promoted`;
        if (pageActionNameToPromote.startsWith('"'))
            promotedName = `"${pageActionNameToPromote.removeQuotes()}_Promoted"`;
        return promotedName;
    }

    private getCurrentPageActionName(syntaxTree: SyntaxTree): string | undefined {
        const pageActionNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), this.range.start, [FullSyntaxTreeNodeKind.getPageAction()])
        if (!pageActionNode)
            return undefined

        const actualNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), this.range.start)!
        if (ALFullSyntaxTreeNodeExt.findParentNodeOfKind(actualNode, FullSyntaxTreeNodeKind.getTriggerDeclaration()) !== undefined)
            return undefined
        return pageActionNode.childNodes![0].identifier
    }
    private indentAndMakeItOneliner(textToInsertArr: string[], indent: number): string {
        return textToInsertArr.map((entry) => { return "".padStart(indent, " ") + entry; }).join("\r\n") + "\r\n";
    }

    private checkIfPromotedPropertyOnActionsExist(syntaxTree: SyntaxTree): boolean {
        const actionNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(syntaxTree.getRoot(), [FullSyntaxTreeNodeKind.getPageAction()], true)
        return actionNodes.some(actionNode => {
            const propertyListNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(actionNode, FullSyntaxTreeNodeKind.getPropertyList(), false);
            if (!propertyListNode) return false;
            const propertyNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(propertyListNode, [FullSyntaxTreeNodeKind.getProperty()], false);
            return propertyNodes.some(propertyNode => {
                const propertyNameNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(propertyNode, FullSyntaxTreeNodeKind.getPropertyName(), false);
                if (propertyNameNode && propertyNameNode.identifier)
                    return propertyNameNode.identifier.toLowerCase() == 'promoted';
                return false
            })
        })
    }
    private checkIfCurrentActionIsAlreadyPromotedAsActionRef(currentPageActionName: string, syntaxTree: SyntaxTree): boolean {
        const actionRefNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(syntaxTree.getRoot(), [FullSyntaxTreeNodeKind.getPageActionRef()], true)
        return actionRefNodes.some(actionRefNode => {
            if (!actionRefNode.childNodes) return false;
            const promotedAction = actionRefNode.childNodes[1].identifier!;
            return promotedAction.toLowerCase().removeQuotes() == currentPageActionName.toLowerCase().removeQuotes()
        })
    }

}