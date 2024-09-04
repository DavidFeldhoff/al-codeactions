import { CodeAction, CodeActionContext, CodeActionKind, CodeActionTriggerKind, Position, QuickInputButton, QuickPickItemKind, Range, Selection, SnippetString, TextDocument, TextEditor, TextEditorRevealType, window, workspace, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { Command } from "../Entities/Command";
import { DocumentUtils } from "../Utils/documentUtils";
import { ICodeActionProvider } from "./ICodeActionProvider";
import { Config } from "../Utils/config";

export class CodeActionProviderPromoteAction implements ICodeActionProvider {
    document: TextDocument;
    range: Range;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(context: CodeActionContext): Promise<boolean> {
        if (context.only && !context.only.contains(CodeActionKind.QuickFix))
            return false;
        if (context.triggerKind == CodeActionTriggerKind.Automatic)
            if (!Config.getExecuteCodeActionsAutomatically(this.document.uri))
                return false;
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
        const pageExtensionNode = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), this.range.start, [FullSyntaxTreeNodeKind.getPageExtensionObject()])
        if (pageExtensionNode)
            await this.runCommandOnPageExtension(pageExtensionNode)
        else
            await this.runCommandOnPage()
    }
    private async runCommandOnPageExtension(pageExtensionNode: ALFullSyntaxTreeNode) {
        const pageExtension = { node: pageExtensionNode, document: window.activeTextEditor!.document }

        const syntaxTree = await SyntaxTree.getInstance(this.document);
        const currentPageActionName = this.getCurrentPageActionName(syntaxTree)!;
        const locationOfBasePage = await ALFullSyntaxTreeNodeExt.getExtendedObjectLocation(this.document, pageExtensionNode);

        const textEditorSave = window.activeTextEditor!

        let page: { node: ALFullSyntaxTreeNode, document: TextDocument } | undefined
        if (locationOfBasePage) {
            let extendedObjectDoc: TextDocument = await workspace.openTextDocument(locationOfBasePage.uri);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(extendedObjectDoc);
            const pageNode = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), locationOfBasePage.range.start, [FullSyntaxTreeNodeKind.getPageObject()]);
            if (pageNode)
                page = { node: pageNode, document: extendedObjectDoc }
        }
        const { aborted, chosenItem } = await this.askIfActionShouldBePromotedToExistingNode(page, pageExtension)
        // if (page) {
        //     if (window.visibleTextEditors.some(textEditor => page && textEditor.document.uri.fsPath === page.editor.document.uri.fsPath)) {
        //         await window.showTextDocument(page.editor.document, page.editor.viewColumn)
        //         await commands.executeCommand('workbench.action.closeActiveEditor')
        //     }
        // }
        await window.showTextDocument(textEditorSave.document, textEditorSave.viewColumn)
        if (aborted)
            return

        if (chosenItem) {
            let existingAnchorGroupOfPageExt
            if (typeof chosenItem !== "string")
                existingAnchorGroupOfPageExt = ALFullSyntaxTreeNodeExt.findParentNodeOfKind(chosenItem, FullSyntaxTreeNodeKind.getPageExtensionObject()) !== undefined
            if (existingAnchorGroupOfPageExt)
                await this.addToEndOfExistingActionGroup(currentPageActionName, chosenItem as ALFullSyntaxTreeNode, page?.node);
            else
                await this.addToAddLastOfActionGroup(currentPageActionName, chosenItem, pageExtensionNode);
        }
        else
            await this.addToAddLastOfPromotedActionArea(currentPageActionName, pageExtensionNode, page?.node);
    }
    private async runCommandOnPage() {
        const syntaxTree = await SyntaxTree.getInstance(this.document);
        const currentPageActionName = this.getCurrentPageActionName(syntaxTree)!;
        const pageNode = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(syntaxTree.getRoot(), [FullSyntaxTreeNodeKind.getPageObject()], false).pop()!;
        const { aborted, chosenItem } = await this.askIfActionShouldBePromotedToExistingNode({ node: pageNode, document: window.activeTextEditor!.document }, undefined)
        if (aborted)
            return
        if (chosenItem && typeof chosenItem !== "string")
            await this.addToEndOfExistingActionGroup(currentPageActionName, chosenItem, pageNode);
        else {
            const actionAreaNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(syntaxTree.getRoot(), [FullSyntaxTreeNodeKind.getPageActionArea()], true)
            const promotedActionArea = actionAreaNodes.find(node => node.name && node.name.toLowerCase() == 'promoted')
            if (promotedActionArea)
                this.addToEndOfPromotedActionArea(currentPageActionName, promotedActionArea, pageNode);
            else
                this.addPromotedActionAreaAfterNormalActionArea(currentPageActionName, actionAreaNodes.pop()!, pageNode)
        }
    }
    private async askIfActionShouldBePromotedToExistingNode(page: { node: ALFullSyntaxTreeNode, document: TextDocument } | undefined, pageExtension: { node: ALFullSyntaxTreeNode, document: TextDocument } | undefined): Promise<{ aborted: boolean; chosenItem: ALFullSyntaxTreeNode | string | undefined }> {
        interface myPick { label: string; kind?: QuickPickItemKind; description?: string; detail?: string; picked?: boolean; alwaysShow?: boolean; buttons?: readonly QuickInputButton[]; range?: Range; node?: ALFullSyntaxTreeNode; document?: TextDocument, editor?: TextEditor }
        let items: myPick[] = []

        items.push({ label: 'Create new', kind: QuickPickItemKind.Separator })
        const newGroupLbl = 'Create new promoted action group...';
        let newActionGroupPick = { label: newGroupLbl }
        items.push(newActionGroupPick)

        let pagePromotedActionGroupNodes: ALFullSyntaxTreeNode[] = []
        if (page) {
            const actionAreaNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(page.node, [FullSyntaxTreeNodeKind.getPageActionArea()], true)
            const promotedActionArea = actionAreaNodes.find(node => node.name && node.name.toLowerCase() == 'promoted')
            if (promotedActionArea)
                pagePromotedActionGroupNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(promotedActionArea, [FullSyntaxTreeNodeKind.getPageActionGroup()], false)
            if (pagePromotedActionGroupNodes.length > 0) {
                items.push({ label: 'Promoted action groups on page', kind: QuickPickItemKind.Separator })
                items = items.concat(
                    pagePromotedActionGroupNodes.map(pageActionGroupNode => {
                        let caption: string = ""
                        const propertyList = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(pageActionGroupNode, FullSyntaxTreeNodeKind.getPropertyList(), false);
                        if (propertyList) {
                            const properties = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(propertyList, [FullSyntaxTreeNodeKind.getProperty()], false);
                            const captionPropertyNode = properties.find(property => property.name?.toLowerCase() === "caption")
                            if (captionPropertyNode) {
                                const labelNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(captionPropertyNode.childNodes![1], FullSyntaxTreeNodeKind.getLabel(), false)!
                                const stringLiteralNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(labelNode, FullSyntaxTreeNodeKind.getStringLiteralValue(), false)!
                                const captionPropertyValue = page.document.getText(DocumentUtils.trimRange(page.document, TextRangeExt.createVSCodeRange(stringLiteralNode.fullSpan)))
                                caption = `Caption = ${captionPropertyValue}`;
                            }
                        }
                        return {
                            label: pageActionGroupNode.name!,
                            description: caption,
                            range: DocumentUtils.trimRange(page.document, TextRangeExt.createVSCodeRange(pageActionGroupNode.fullSpan)),
                            node: pageActionGroupNode,
                            document: page.document
                        }
                    })
                )
            }
        }

        if (pageExtension) {
            const actionAddChangeNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(pageExtension.node, [FullSyntaxTreeNodeKind.getActionAddChange()], true)
            const addChangeNodesToPromoted = actionAddChangeNodes.filter(node => node.childNodes && node.childNodes[0].identifier && node.childNodes[0].identifier.toLowerCase() == 'promoted')
            let newPromotedPageActionGroupNodesInPageExt: ALFullSyntaxTreeNode[] = []
            for (const addChangeNodeToPromoted of addChangeNodesToPromoted) {
                newPromotedPageActionGroupNodesInPageExt = newPromotedPageActionGroupNodesInPageExt.concat(
                    ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(addChangeNodeToPromoted, [FullSyntaxTreeNodeKind.getPageActionGroup()], false)
                )
            }
            if (newPromotedPageActionGroupNodesInPageExt.length > 0) {
                items.push({ label: 'Promoted action groups on pageextension', kind: QuickPickItemKind.Separator })
                items = items.concat(
                    newPromotedPageActionGroupNodesInPageExt.map(newPromotedPageActionGroupNodeInPageExt => {
                        return {
                            label: newPromotedPageActionGroupNodeInPageExt.name!,
                            range: DocumentUtils.trimRange(pageExtension.document, TextRangeExt.createVSCodeRange(newPromotedPageActionGroupNodeInPageExt.fullSpan)),
                            node: newPromotedPageActionGroupNodeInPageExt,
                            document: pageExtension.document
                        }
                    })
                )
            }

            const addChangeNodesToDefaultPromotedActionGroups = actionAddChangeNodes
                .filter(node =>
                    node.childNodes && node.childNodes[0].identifier && this.defaultActionGroups.some(defaultActionGroupName => defaultActionGroupName.toLowerCase() === node.childNodes![0].identifier?.toLowerCase())
                )
            if (addChangeNodesToDefaultPromotedActionGroups.length > 0) {
                items.push({ label: 'Additions to default promoted action groups', kind: QuickPickItemKind.Separator })
                items = items.concat(
                    addChangeNodesToDefaultPromotedActionGroups.map(addChangeNodeToDefaultPromotedActionGroups => {
                        const range = DocumentUtils.trimRange(pageExtension.document, TextRangeExt.createVSCodeRange(addChangeNodeToDefaultPromotedActionGroups.fullSpan))
                        const text = pageExtension.document.getText(range)
                        const keyword = text.substring(0, text.indexOf('('))
                        return {
                            label: addChangeNodeToDefaultPromotedActionGroups.childNodes![0].identifier!,
                            description: keyword,
                            range: range,
                            node: addChangeNodeToDefaultPromotedActionGroups,
                            document: pageExtension.document
                        }
                    })
                )
            }
        }

        if (items.length == 2 && !pageExtension)
            return { aborted: false, chosenItem: undefined }

        const rangeOfNewGroup = items.length == 0 ? undefined : new Range(items[items.length - 1].range!.end, items[items.length - 1].range!.end)
        const documentOfLastItem = items.length == 0 ? undefined : items[items.length - 1].document
        if (pageExtension) {
            items.push({ label: 'Default promoted action groups not promoted yet', kind: QuickPickItemKind.Separator })
            const defaultActionGroups = this.getOpenDefaultActionGroups(page?.node);
            for (const defaultActionGroup of defaultActionGroups)
                if (!items.some(item => item.label.toLowerCase() === defaultActionGroup.toLowerCase()))
                    items.push({ label: defaultActionGroup, node: undefined, range: rangeOfNewGroup, document: documentOfLastItem })
        }

        const pickedItem: myPick | undefined = await window.showQuickPick(items, {
            canPickMany: false,
            title: 'To which action group should it be promoted?'
        });
        // let viewColumnBeside: ViewColumn | undefined = undefined
        // let newTextEditors: TextEditor[] = []
        // const pickedItem: myPick | undefined = await window.showQuickPick(items, {
        //     canPickMany: false,
        //     title: 'To which action group should it be promoted?',
        //     async onDidSelectItem(item: myPick) {
        //         if (item.document && item.range) {
        //             let editor: TextEditor
        //             if (!viewColumnBeside) {
        //                 editor = await window.showTextDocument(item.document, ViewColumn.Beside, true)
        //                 newTextEditors.push(editor);
        //                 viewColumnBeside = editor.viewColumn
        //                 console.log(`viewColumnBeside is undefined. Setting it once to ${viewColumnBeside}`)
        //             }
        //             const editorAlreadyOpened = newTextEditors.find(editor => editor.document.uri.fsPath == item.document?.uri.fsPath)
        //             if (!editorAlreadyOpened) {
        //                 console.log(`editor wasn't already opened. Open it once ${item.document.uri.fsPath} on viewcolumn ${viewColumnBeside}`)
        //                 editor = await window.showTextDocument(item.document, { viewColumn: viewColumnBeside, preserveFocus: true, preview: false })
        //                 newTextEditors.push(editor);
        //             } else {
        //                 editor = editorAlreadyOpened
        //                 await window.showTextDocument(editorAlreadyOpened.document, { viewColumn: viewColumnBeside, preserveFocus: true, preview: false })
        //                 console.log(`editor was activated again`)
        //             }
        //             editor.revealRange(item.range, TextEditorRevealType.InCenter)
        //             editor.selection = new Selection(item.range.start, item.range.end);
        //         }
        //     }
        // })
        // for (const newTextEditor of newTextEditors) {
        //     await window.showTextDocument(newTextEditor.document, newTextEditor.viewColumn)
        //     await commands.executeCommand('workbench.action.closeActiveEditor')
        // }

        if (!pickedItem)
            return { aborted: true, chosenItem: undefined }
        if (pickedItem.label != newGroupLbl && pickedItem.node)
            return { aborted: false, chosenItem: pickedItem.node }
        if (pickedItem.label != newGroupLbl)
            return { aborted: false, chosenItem: pickedItem.label }
        return { aborted: false, chosenItem: undefined }
    }

    private async addToEndOfExistingActionGroup(pageActionNameToPromote: string, actionGroupNode: ALFullSyntaxTreeNode, pageNode: ALFullSyntaxTreeNode | undefined) {
        const { textToInsert, newLines } = this.getTextToInsert(false, false, pageActionNameToPromote, actionGroupNode, pageNode);
        const actionGroupRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(actionGroupNode.fullSpan));

        const edit = new WorkspaceEdit();
        const lineToInsert = actionGroupRange.end.line
        edit.insert(this.document.uri, new Position(lineToInsert, 0), textToInsert);
        await workspace.applyEdit(edit);
        this.revealRange(lineToInsert, newLines)
        const pos = new Position(lineToInsert + newLines - 2, 10000)
        window.activeTextEditor!.selection = new Selection(pos, pos)
    }
    private async addToEndOfPromotedActionArea(pageActionNameToPromote: string, promotedActionArea: ALFullSyntaxTreeNode, pageNode: ALFullSyntaxTreeNode | undefined) {
        const { textToInsert, newLines } = this.getTextToInsert(false, true, pageActionNameToPromote, promotedActionArea, pageNode)
        const promotedActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(promotedActionArea.fullSpan));
        const snippetString = new SnippetString(textToInsert);
        const lineToInsert = promotedActionAreaRange.end.line
        await window.activeTextEditor!.insertSnippet(snippetString, new Position(lineToInsert, 0));
        this.revealRange(lineToInsert, newLines)
    }
    private async addPromotedActionAreaAfterNormalActionArea(pageActionNameToPromote: string, normalPageActionAreaNode: ALFullSyntaxTreeNode, pageNode: ALFullSyntaxTreeNode | undefined) {
        const pageActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(normalPageActionAreaNode.fullSpan));
        const { textToInsert, newLines } = this.getTextToInsert(true, true, pageActionNameToPromote, normalPageActionAreaNode, pageNode)
        const snippetString = new SnippetString(textToInsert);
        const lineToInsert = pageActionAreaRange.end.line + 1
        await window.activeTextEditor!.insertSnippet(snippetString, new Position(lineToInsert, 0));
        this.revealRange(lineToInsert, newLines)
    }
    private async addToAddLastOfActionGroup(pageActionNameToPromote: string, anchorActionGroupNode: ALFullSyntaxTreeNode | string, pageExtensionNode: ALFullSyntaxTreeNode) {
        const pageExtensionActionListNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(pageExtensionNode, FullSyntaxTreeNodeKind.getPageExtensionActionList(), true)!
        const actionAddChangeNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(pageExtensionActionListNode, [FullSyntaxTreeNodeKind.getActionAddChange()], false)

        const anchorActionGroupName: string = typeof anchorActionGroupNode === "string" ? anchorActionGroupNode : anchorActionGroupNode.name!;
        const nodeOfAddLastAnchorActionGroup = actionAddChangeNodes.find(node => {
            const data = this.getChangeKeywordAndAnchor(node, this.document);
            return data && data.addChangeKeyword.toLowerCase() == 'addlast' && data.anchor?.toLowerCase().removeQuotes() == anchorActionGroupName.toLowerCase().removeQuotes()
        })

        const { textToInsert, newLines } = this.getTextToInsertToAddLastOfActionGroup(pageActionNameToPromote, anchorActionGroupName, nodeOfAddLastAnchorActionGroup, pageExtensionActionListNode);
        let lineToInsert
        if (nodeOfAddLastAnchorActionGroup)
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(nodeOfAddLastAnchorActionGroup.fullSpan)).end.line;
        else
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageExtensionActionListNode.fullSpan)).end.line;

        const edit = new WorkspaceEdit();
        edit.insert(this.document.uri, new Position(lineToInsert, 0), textToInsert);
        await workspace.applyEdit(edit);
        this.revealRange(lineToInsert, newLines)
        const pos = new Position(lineToInsert + newLines - 2, 10000)
        window.activeTextEditor!.selection = new Selection(pos, pos)
    }
    private async addToAddLastOfPromotedActionArea(pageActionNameToPromote: string, pageExtensionNode: ALFullSyntaxTreeNode, pageNode: ALFullSyntaxTreeNode | undefined) {
        const pageExtensionActionListNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(pageExtensionNode, FullSyntaxTreeNodeKind.getPageExtensionActionList(), true)!
        const actionAddChangeNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(pageExtensionActionListNode, [FullSyntaxTreeNodeKind.getActionAddChange()], false)
        const nodeOfAddLastPromoted = actionAddChangeNodes.find(node => {
            const data = this.getChangeKeywordAndAnchor(node, this.document)
            if (data && data.anchor?.toLowerCase() == "promoted" && data.addChangeKeyword.toLowerCase() === 'addlast')
                return true;
            return false;
        })

        const { textToInsert, newLines } = this.getTextToInsertToAddLastOfPromotedActionArea(pageActionNameToPromote, nodeOfAddLastPromoted, pageExtensionActionListNode, pageNode)
        let lineToInsert
        if (nodeOfAddLastPromoted)
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(nodeOfAddLastPromoted.fullSpan)).end.line
        else
            lineToInsert = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageExtensionActionListNode.fullSpan)).end.line

        const snippetString = new SnippetString(textToInsert);
        await window.activeTextEditor!.insertSnippet(snippetString, new Position(lineToInsert, 0));
        this.revealRange(lineToInsert, newLines)
    }
    private getChangeKeywordAndAnchor(actionAddChangeNode: ALFullSyntaxTreeNode, document: TextDocument) {
        if (actionAddChangeNode.childNodes) {
            const anchor = actionAddChangeNode.childNodes[0].identifier
            const nodeText = document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(actionAddChangeNode.fullSpan)))
            const addChangeKeyword = nodeText.substring(0, nodeText.indexOf('('))
            return { addChangeKeyword, anchor }
        }
        return undefined
    }
    private getTextToInsert(addArea: boolean, addGroup: boolean, pageActionNameToPromote: string, node: ALFullSyntaxTreeNode, pageNode: ALFullSyntaxTreeNode | undefined) {
        let textToInsert: string
        const promotedName = this.getPromotedActionName(pageActionNameToPromote);
        let textToInsertArrActionRef = [
            `actionref(${promotedName}; ${pageActionNameToPromote})`,
            `{`,
            `}`
        ]
        const actionGroupOrActionAddChangeIndent = this.getActionGroupOrAddChangeIndent(node);
        if (actionGroupOrActionAddChangeIndent && !addArea && !addGroup) {
            textToInsert = this.indentAndMakeItOneliner(textToInsertArrActionRef, actionGroupOrActionAddChangeIndent + 4)
            const newLines = textToInsert.split("\n").length
            return { textToInsert, newLines }
        }

        const actionAreaIndent = this.getPageActionAreaIndent(node);
        textToInsert = this.indentAndMakeItOneliner(textToInsertArrActionRef, actionAreaIndent + 8)

        if (addGroup) {
            const defaultActionGroups = this.getOpenDefaultActionGroups(pageNode);
            const part1 = [
                `group(\${1|${defaultActionGroups.join(',')}|})`,
                `{`,
                `    Caption = '\${2:\${1/^"?Category_(.*?)"?\$/\$1/}}';`,
                `    `
            ]
            const part2 = [`}`]
            textToInsert = this.indentAndMakeItOneliner(part1, actionAreaIndent + 4) + textToInsert + this.indentAndMakeItOneliner(part2, actionAreaIndent + 4)
        }
        if (addArea) {
            const part1 = [
                `area(Promoted)`,
                `{`
            ]
            const part2 = [`}`]
            textToInsert = this.indentAndMakeItOneliner(part1, actionAreaIndent) + textToInsert + this.indentAndMakeItOneliner(part2, actionAreaIndent)
        }
        const newLines = textToInsert.split("\n").length
        return { textToInsert, newLines }
    }
    private getTextToInsertToAddLastOfActionGroup(pageActionNameToPromote: string, anchorActionGroupName: string, nodeOfAddLastAnchorActionGroup: ALFullSyntaxTreeNode | undefined, pageExtensionActionListNode: ALFullSyntaxTreeNode) {
        if(!anchorActionGroupName.startsWith('"') && !anchorActionGroupName.match(/^\w[\w\d_]*$/))
            anchorActionGroupName = `"${anchorActionGroupName}"`
        const indent = this.getPageExtensionActionListIndent(pageExtensionActionListNode);

        let textToInsert: string
        const promotedName = this.getPromotedActionName(pageActionNameToPromote);

        if (nodeOfAddLastAnchorActionGroup) {
            let textToInsertArrActionRef = [
                `actionref(${promotedName}; ${pageActionNameToPromote})`,
                `{`,
                `}`
            ]
            textToInsert = this.indentAndMakeItOneliner(textToInsertArrActionRef, indent + 8)
        } else {
            const part1 = [
                `addlast(${anchorActionGroupName})`,
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
    private getTextToInsertToAddLastOfPromotedActionArea(pageActionNameToPromote: string, nodeOfAddLastPromoted: ALFullSyntaxTreeNode | undefined, pageExtensionActionListNode: ALFullSyntaxTreeNode, pageNode: ALFullSyntaxTreeNode | undefined) {
        const indent = this.getPageExtensionActionListIndent(pageExtensionActionListNode);

        let textToInsert: string
        const promotedName = this.getPromotedActionName(pageActionNameToPromote);
        if (nodeOfAddLastPromoted) {
            const part = [
                `group(\${1:Category_})`,
                `{`,
                `    Caption = '\${2:\${1/^"?Category_(.*?)"?\$/\$1/}}';`,
                `    `,
                `    actionref(${promotedName}; ${pageActionNameToPromote})`,
                `    {`,
                `    }`,
                `}`,
            ]
            textToInsert = this.indentAndMakeItOneliner(part, indent + 8)
        } else {
            const part = [
                `addlast(Promoted)`,
                `{`,
                `    group(\${1:Category_})`,
                `    {`,
                `        Caption = '\${2:\${1/^"?Category_(.*?)"?\$/\$1/}}';`,
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
    defaultActionGroups = ["Category_Process", "Category_New", "Category_Report", "Category_Category4", "Category_Category5", "Category_Category6", "Category_Category7", "Category_Category8", "Category_Category9", "Category_Category10", "Category_Category11", "Category_Category12", "Category_Category13", "Category_Category14", "Category_Category15", "Category_Category16", "Category_Category17", "Category_Category18", "Category_Category19", "Category_Category20"];
    private getOpenDefaultActionGroups(pageNode: ALFullSyntaxTreeNode | undefined) {
        let openDefaultActionGroups = this.defaultActionGroups;
        if (pageNode) {
            const pageActionGroups = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(pageNode, [FullSyntaxTreeNodeKind.getPageActionGroup()], true);
            for (const pageActionGroup of pageActionGroups) {
                if (pageActionGroup.childNodes && pageActionGroup.childNodes[0].identifier)
                    openDefaultActionGroups = openDefaultActionGroups.filter(groupName => groupName.toLowerCase() !== pageActionGroup.childNodes![0].identifier?.toLowerCase());
            }
        }
        return openDefaultActionGroups;
    }

    private getPageActionAreaIndent(node: ALFullSyntaxTreeNode) {
        let pageActionAreaNode: ALFullSyntaxTreeNode
        if (node.kind == FullSyntaxTreeNodeKind.getPageActionArea())
            pageActionAreaNode = node;
        else
            pageActionAreaNode = ALFullSyntaxTreeNodeExt.findParentNodeOfKind(node, FullSyntaxTreeNodeKind.getPageActionArea())!
        const pageActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageActionAreaNode.fullSpan));
        return pageActionAreaRange.start.character
    }
    private getPageExtensionActionListIndent(node: ALFullSyntaxTreeNode) {
        let pageExtensionActionListNode: ALFullSyntaxTreeNode
        if (node.kind == FullSyntaxTreeNodeKind.getPageExtensionActionList())
            pageExtensionActionListNode = node;
        else
            pageExtensionActionListNode = ALFullSyntaxTreeNodeExt.findParentNodeOfKind(node, FullSyntaxTreeNodeKind.getPageExtensionActionList())!
        const pageExtensionActionListRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(pageExtensionActionListNode.fullSpan));
        return pageExtensionActionListRange.start.character
    }
    private getActionGroupOrAddChangeIndent(node: ALFullSyntaxTreeNode) {
        if ([FullSyntaxTreeNodeKind.getPageActionGroup(), FullSyntaxTreeNodeKind.getActionAddChange()].includes(node.kind!)) {
            const pageActionAreaRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(node.fullSpan));
            return pageActionAreaRange.start.character
        }
        return undefined
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
        const eol = DocumentUtils.getEolByTextDocument(this.document)
        return textToInsertArr.map((entry) => { return "".padStart(indent, " ") + entry; }).join(eol) + eol;
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