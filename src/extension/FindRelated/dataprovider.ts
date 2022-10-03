import { CancellationTokenSource, Location, MarkdownString, Position, Range, ReferenceProvider, TextDocument, TextDocumentShowOptions, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, TreeItemLabel, Uri } from "vscode";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { Document } from "../Entities/document";
import { DocumentUtils } from "../Utils/documentUtils";

export class FindRelatedDataProvider implements TreeDataProvider<TreeItem>{
    referenceProvider: ReferenceProvider
    document: TextDocument
    range: Range
    constructor(document: TextDocument, range: Range, referenceProvider: ReferenceProvider) {
        this.referenceProvider = referenceProvider;
        this.document = document;
        this.range = range;
    }
    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }
    async getChildren(element?: TreeItem | undefined): Promise<TreeItem[]> {
        const data = await this.getData()
        const treeItems: TreeItem[] = []
        if (!element) {
            const uniqueUris: Uri[] = []
            for (const location of data)
                if (!uniqueUris.some(uri => uri.fsPath === location.uri.fsPath))
                    uniqueUris.push(location.uri)
            for (const uri of uniqueUris)
                treeItems.push(
                    {
                        resourceUri: uri,
                        collapsibleState: TreeItemCollapsibleState.Expanded,
                        iconPath: ThemeIcon.File
                    }
                )
            return treeItems;
        }
        if (!element.resourceUri)
            throw new Error('resourceUri has to be set.')
        const locationsOfUri = data.filter(location => location.uri.fsPath === element.resourceUri!.fsPath)
        for (const location of locationsOfUri) {
            const doc: Document = await Document.load(location.uri)
            const treeItemLabel: TreeItemLabel = this.getTreeItemLabel(doc, location)
            const syntaxTree = await SyntaxTree.getInstance2(doc.uri.fsPath, doc.fileContent)
            const methodOrTriggerNode = syntaxTree.findTreeNode(location.range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()])
            const tooltip = this.getTooltip(doc, location, methodOrTriggerNode);
            const description: string | boolean = this.getDescription(methodOrTriggerNode);

            const treeItem: TreeItem = {
                label: treeItemLabel,
                collapsibleState: TreeItemCollapsibleState.None,
                // resourceUri: location.uri,
                command: {
                    command: 'vscode.open',
                    arguments: [location.uri, <TextDocumentShowOptions>{ selection: location.range }],
                    title: 'Open'
                },
                tooltip: tooltip,
                description: description
            }
            treeItems.push(treeItem)
        }
        return treeItems
    }

    private getTreeItemLabel(doc: Document, location: Location): TreeItemLabel {
        const label = doc.fileLines[location.range.start.line].trimLeft()
        const indent = doc.fileLines[location.range.start.line].length - label.length
        return {
            label: label,
            highlights: [
                [location.range.start.character - indent, location.range.end.character - indent]
            ]
        }
    }
    private getTooltip(doc: Document, location: Location, methodOrTriggerNode: ALFullSyntaxTreeNode | undefined): MarkdownString {
        const methodOrTriggerRange: Range | undefined = methodOrTriggerNode ? DocumentUtils.trimRange3(doc.fileContent, TextRangeExt.createVSCodeRange(methodOrTriggerNode.fullSpan)) : undefined;
        const linesAround = 5;
        let startLine = location.range.start.line - linesAround
        if (methodOrTriggerRange && startLine < methodOrTriggerRange.start.line)
            startLine = methodOrTriggerRange.start.line
        if (startLine < 0)
            startLine = 0
        let endLine = location.range.end.line + linesAround
        if (methodOrTriggerRange && endLine > methodOrTriggerRange.end.line)
            endLine = methodOrTriggerRange.end.line
        if (endLine > doc.fileLines.length - 1)
            endLine = doc.fileLines.length - 1
        const tooltipArray = doc.fileLines.slice(startLine, endLine + 1)
        const tooltip = ['```al'].concat(tooltipArray).concat('```').join('\r\n')
        return new MarkdownString(tooltip, true);
    }
    private getDescription(methodOrTriggerNode: ALFullSyntaxTreeNode | undefined) {
        let description: string | boolean = false;
        if (methodOrTriggerNode && methodOrTriggerNode.name && methodOrTriggerNode.kind)
            if (methodOrTriggerNode.kind == FullSyntaxTreeNodeKind.getTriggerDeclaration())
                description = `trigger ${methodOrTriggerNode.name}`;

            else
                description = `${methodOrTriggerNode.accessModifier ? methodOrTriggerNode.accessModifier + ' ' : ''}procedure ${methodOrTriggerNode.name}`;
        return description;
    }

    private async getData(): Promise<Location[]> {
        const locations = await this.referenceProvider.provideReferences(this.document, this.range.start, { includeDeclaration: false }, new CancellationTokenSource().token)
        return locations ? locations : []
    }
}