import { CodeAction, CodeActionKind, Position, Range, Selection, SnippetString, TextDocument, TextEditorRevealType, TreeItemCollapsibleState, window, workspace, WorkspaceEdit } from "vscode";
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
        const actionAreaNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(syntaxTree.getRoot(), [FullSyntaxTreeNodeKind.getPageActionArea()], true)
        const promotedActionArea = actionAreaNodes.find(node => node.name && node.name.toLowerCase() == 'promoted')
        if (promotedActionArea) {
            const { aborted, chosenNode } = await this.askIfActionShouldBePromotedToExistingNode(promotedActionArea)
            if (aborted)
                return
            if (chosenNode)
                this.addToEndOfActionGroup(currentPageActionName, chosenNode);
            else
                this.addToEndOfPromotedActionArea(currentPageActionName, promotedActionArea);
        } else
            this.addPromotedActionAreaAfterNormalActionArea(currentPageActionName, actionAreaNodes.pop()!)
    }
    private async askIfActionShouldBePromotedToExistingNode(promotedActionArea: ALFullSyntaxTreeNode) {
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
        const selectionSave = window.activeTextEditor!.selection;
        const pickedItem: myPick | undefined = await window.showQuickPick(items, {
            canPickMany: false,
            title: 'To which action group should it be promoted?',
            onDidSelectItem(item: myPick) {
                window.activeTextEditor!.revealRange(item.range, TextEditorRevealType.InCenter)
                window.activeTextEditor!.selection = new Selection(item.range.start, item.range.end);
            },
        })
        await window.showTextDocument(this.document);
        window.activeTextEditor!.selection = selectionSave;
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
    private getTextToInsert(addArea: boolean, addGroup: boolean, pageActionNameToPromote: string, node: ALFullSyntaxTreeNode) {
        let pageActionAreaNode: ALFullSyntaxTreeNode
        if (node.kind === FullSyntaxTreeNodeKind.getPageActionArea())
            pageActionAreaNode = node;
        else
            pageActionAreaNode = ALFullSyntaxTreeNodeExt.findParentNodeOfKind(node, FullSyntaxTreeNodeKind.getPageActionArea())!
        const pageActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageActionAreaNode.fullSpan));
        const indent = pageActionAreaRange.start.character

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