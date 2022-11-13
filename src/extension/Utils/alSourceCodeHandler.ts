import { Location, Position, Range, Selection, TextDocument, TextEditorRevealType, ThemeIcon, window } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { ALMethodNode } from '../AL Code Outline/alMethodNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { AccessModifier } from '../Entities/accessModifier';
import { ALProcedure } from '../Entities/alProcedure';
import { MethodType } from '../Entities/methodTypes';
import { Config, FindNewProcedureLocation } from './config';
import { DocumentUtils } from './documentUtils';
import { Err } from './Err';
import { MethodClassifier } from './MethodClassifier';

export class ALSourceCodeHandler {

    private document: TextDocument;
    constructor(document: TextDocument) {
        this.document = document;
    }
    public async getPositionToInsertProcedure(procedureToInsert: ALProcedure, sourceLocation: Location, askForProcedurePosition: boolean, appInsightsEntryProperties: any, config: FindNewProcedureLocation = Config.getFindNewProcedureLocation(this.document.uri)): Promise<Position | undefined> {

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let rootNode: ALFullSyntaxTreeNode = syntaxTree.getRoot();
        let objectNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(rootNode, FullSyntaxTreeNodeKind.getAllObjectKinds(), false);
        let targetObjectNode: ALFullSyntaxTreeNode | undefined = objectNodes.find(objectNode => objectNode.name?.toLowerCase().removeQuotes() == procedureToInsert.ObjectOfProcedure.name.toLowerCase().removeQuotes())
        if (!targetObjectNode)
            Err._throw('Unable to locate target object. Please file an issue on github.')
        let methodOrTriggerNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(targetObjectNode, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()], false)
        let classifiedNodes: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }[] = this.classifyMethodOrTriggerNodes(methodOrTriggerNodes);
        const lines: string[] = this.document.getText().split(DocumentUtils.getEolByTextDocument(this.document))
        let regionStack: string[] = [];
        let regions: { range: Range, regionName: string }[] = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('#region ')) {
                regionStack.push(lines[i].trim().substring('#region '.length).trim())
                const range = new Range(i, 0, i, lines[i].length)
                regions.push({ range: range, regionName: `#region ${regionStack[regionStack.length - 1]}` })
            } else if (lines[i].trim().startsWith('#endregion')) {
                const range = new Range(i, 0, i, lines[i].length)
                regions.push({ range: range, regionName: `#endregion ${regionStack.pop()}` });
            }
        }


        let result: { anchorNode: ALFullSyntaxTreeNode | { range: Range, regionName: string } | undefined, userCanceled: boolean } = await this.getAnchorNode(config, procedureToInsert, classifiedNodes, regions, targetObjectNode, sourceLocation, askForProcedurePosition, appInsightsEntryProperties)
        if (result.userCanceled)
            return undefined

        if (result.anchorNode && (<ALFullSyntaxTreeNode>result.anchorNode).kind) {
            result.anchorNode = result.anchorNode as ALFullSyntaxTreeNode
            if (result.anchorNode.kind == FullSyntaxTreeNodeKind.getTriggerDeclaration()) {
                let globalVarSections: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(targetObjectNode, [FullSyntaxTreeNodeKind.getGlobalVarSection()], false);
                if (globalVarSections.length > 1)
                    result.anchorNode = globalVarSections.pop()!
            }
            let endPositionOfAnchor: Position = TextRangeExt.createVSCodeRange(result.anchorNode.fullSpan).end

            const userSelectedProcedureIntentionally = askForProcedurePosition
            if (!userSelectedProcedureIntentionally) {
                if (result.anchorNode.name) {
                    const endregionWithSameName = regions.find((entry) => entry.range.start.compareTo(endPositionOfAnchor) >= 0 && entry.regionName == `#endregion ${(result.anchorNode as ALFullSyntaxTreeNode).name}`)
                    if (endregionWithSameName)
                        endPositionOfAnchor = endregionWithSameName.range.end
                }
            }
            return endPositionOfAnchor
        }
        else if (result.anchorNode !== undefined) {
            result.anchorNode = result.anchorNode as { range: Range, regionName: string }
            return result.anchorNode.range.end
        }
        else if (classifiedNodes.length !== 0)
            return TextRangeExt.createVSCodeRange(classifiedNodes[0].node.fullSpan).start
        else {
            let globalVarSection = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(targetObjectNode, FullSyntaxTreeNodeKind.getGlobalVarSection(), false)
            if (globalVarSection)
                return TextRangeExt.createVSCodeRange(globalVarSection.fullSpan).end
            else
                return DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(targetObjectNode.fullSpan)).end.translate(0, -1);
        }
    }
    public async askIfPlaceProcedureManually(suppressUI?: boolean, advancedProcedureCreation?: boolean): Promise<boolean> {
        if (!suppressUI && advancedProcedureCreation === true)
            return (await window.showQuickPick(['Yes', 'No'], { title: 'Place procedure at specific position?' })) == 'Yes';
        return false
    }
    private async getAnchorNode(config: FindNewProcedureLocation, procedureToInsert: ALProcedure, classifiedNodes: { type: MethodType; accessModifier: AccessModifier; range: Range; node: ALFullSyntaxTreeNode; }[], regions: { range: Range, regionName: string }[], targetObjectNode: ALFullSyntaxTreeNode, sourceLocation: Location, askForProcedurePosition: boolean, appInsightsEntryProperties: any): Promise<{ anchorNode: ALFullSyntaxTreeNode | { range: Range, regionName: string } | undefined, userCanceled: boolean }> {
        let anchorNode: ALFullSyntaxTreeNode | { range: Range, regionName: string } | undefined
        if (askForProcedurePosition) {
            if (classifiedNodes.length + regions.length > 1)
                return await this.findPositionByAsking(targetObjectNode, classifiedNodes, regions, this.document, sourceLocation, appInsightsEntryProperties)
            else if (classifiedNodes.length == 1)
                anchorNode = classifiedNodes[0].node
            else if (regions.length == 1)
                anchorNode = regions[0]
        } else {
            let procedureToInsertType: MethodType = MethodClassifier.classifyMethodAsType(procedureToInsert)
            if (config == FindNewProcedureLocation['Sort by type, access modifier, name'])
                anchorNode = classifiedNodes.filter(node =>
                    this.filterBySameType_SameAccessModifier(node, procedureToInsert, procedureToInsertType))
                    .sort(this.sortByName)
                    .filter(node2 => this.filterByName(node2, procedureToInsert))
                    .map(entry => entry.node)
                    .pop()
            else if (config == FindNewProcedureLocation['Sort by type, access modifier, range'])
                anchorNode = classifiedNodes.filter(node =>
                    this.filterBySameType_SameAccessModifier(node, procedureToInsert, procedureToInsertType))
                    .map(entry => entry.node)
                    .pop()
            if (!anchorNode)
                anchorNode = classifiedNodes.filter(node =>
                    this.filterBySameType_HigherAccessModifier(node, procedureToInsert, procedureToInsertType))
                    .sort(this.sortByAccessModifier)
                    .map(entry => entry.node)
                    .pop()
            if (!anchorNode)
                anchorNode = classifiedNodes.filter(node =>
                    this.filterByType(node, procedureToInsertType))
                    .sort(this.sortByType)
                    .map(entry => entry.node)
                    .pop()
        }
        return { anchorNode, userCanceled: false }
    }
    async findPositionByAsking(targetObjectNode: ALFullSyntaxTreeNode, classifiedNodes: { type: MethodType; accessModifier: AccessModifier; range: Range; node: ALFullSyntaxTreeNode; }[], regions: { range: Range, regionName: string }[], document: TextDocument, sourceLocation: Location, appInsightsEntryProperties: any): Promise<{ anchorNode: ALFullSyntaxTreeNode | { range: Range, regionName: string } | undefined, userCanceled: boolean }> {
        interface ownQuickPickItem { label: string, detail?: string, range: Range, node: ALFullSyntaxTreeNode | { range: Range, regionName: string } }
        let methodQPItems: ownQuickPickItem[] = classifiedNodes.map(entry => {
            const identifierRange = TextRangeExt.createVSCodeRange(ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(entry.node, FullSyntaxTreeNodeKind.getIdentifierName(), false)!.fullSpan);
            const procedureContentRange = new Range(identifierRange.start.line, 0, entry.range.end.line, entry.range.end.character)
            let detail: string = document.getText(DocumentUtils.trimRange(document, procedureContentRange)).replace(/\r\n/g, '')
            let label = entry.node.name!
            if (sourceLocation) {
                if (sourceLocation.uri.fsPath == document.uri.fsPath)
                    if (entry.range.contains(sourceLocation.range.start))
                        label += ' (Current)';
            }
            return { label, detail, range: entry.range, node: entry.node }
        })
        let globalVarItem = 'Global variable section'
        let globalVarSection = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(targetObjectNode, FullSyntaxTreeNodeKind.getGlobalVarSection(), false)
        if (globalVarSection)
            methodQPItems.push({ label: globalVarItem, range: TextRangeExt.createVSCodeRange(globalVarSection.fullSpan), node: globalVarSection })
        methodQPItems = methodQPItems.concat(regions.map(entry => { return { label: entry.regionName, range: entry.range, node: entry } }))
        methodQPItems = methodQPItems.sort((a, b) => a.range.end.compareTo(b.range.end))
        let locationBeforeQuickPick: Location | undefined
        if (window.activeTextEditor)
            locationBeforeQuickPick = new Location(window.activeTextEditor.document.uri, window.activeTextEditor.selection)
        if (window.activeTextEditor) {
            if (window.activeTextEditor.document.uri.fsPath != document.uri.fsPath) {
                await window.showTextDocument(document);
            }
        }
        let itemChosen: ownQuickPickItem | undefined = await window.showQuickPick(methodQPItems,
            {
                title: 'Select an anchor after which you want to place your new function.',
                ignoreFocusOut: true,
                matchOnDetail: true,
                onDidSelectItem: (item: ownQuickPickItem) => {
                    window.activeTextEditor?.revealRange(item.range, TextEditorRevealType.InCenter)
                }
            })
        if (!itemChosen) {
            if (window.activeTextEditor)
                if (locationBeforeQuickPick && locationBeforeQuickPick.uri.fsPath != window.activeTextEditor.document.uri.fsPath) {
                    await window.showTextDocument(locationBeforeQuickPick.uri)
                    window.activeTextEditor.revealRange(locationBeforeQuickPick.range);
                }
            return { anchorNode: undefined, userCanceled: true };
        }
        appInsightsEntryProperties.alwaysAsk = true
        appInsightsEntryProperties.selectedAfterCurrent = itemChosen.label.endsWith(' (Current)')
        return { anchorNode: itemChosen.node, userCanceled: false }
    }
    private classifyMethodOrTriggerNodes(methodOrTriggerNodes: ALFullSyntaxTreeNode[]): { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }[] {
        let classifiedNodes: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }[] = []
        let typeClassifiedNodes: { type: MethodType; node: ALFullSyntaxTreeNode; }[] = this.classifyMethodOrTriggerNodesByType(methodOrTriggerNodes)
        let typeAndAccessModifierClassifiedNodes: { type: MethodType, accessModifier: AccessModifier, node: ALFullSyntaxTreeNode; }[] = this.determineAccessModifier(typeClassifiedNodes);
        for (const typeAndAccessModifierClassifiedNode of typeAndAccessModifierClassifiedNodes) {
            let range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(typeAndAccessModifierClassifiedNode.node.fullSpan))
            classifiedNodes.push({
                type: typeAndAccessModifierClassifiedNode.type,
                accessModifier: typeAndAccessModifierClassifiedNode.accessModifier,
                node: typeAndAccessModifierClassifiedNode.node,
                range: range
            })
        }
        return classifiedNodes;
    }
    private classifyMethodOrTriggerNodesByType(methodOrTriggerNodes: ALFullSyntaxTreeNode[]): { type: MethodType; node: ALFullSyntaxTreeNode; }[] {
        let typeClassifiedNodes: { type: MethodType; node: ALFullSyntaxTreeNode; }[] = []
        for (let methodOrTriggerNode of methodOrTriggerNodes) {
            if (methodOrTriggerNode.kind == FullSyntaxTreeNodeKind.getTriggerDeclaration())
                typeClassifiedNodes.push({ type: MethodType.Trigger, node: methodOrTriggerNode })
            else {
                let methodNode: ALMethodNode = ALMethodNode.create(methodOrTriggerNode);
                let type: MethodType = MethodClassifier.classifyMethodAsType(methodNode);
                typeClassifiedNodes.push({ type: type, node: methodOrTriggerNode })
            }
        }
        return typeClassifiedNodes;
    }
    private determineAccessModifier(typeClassifiedNodes: { type: MethodType; node: ALFullSyntaxTreeNode; }[]): { type: MethodType; accessModifier: AccessModifier; node: ALFullSyntaxTreeNode; }[] {
        let nodesWithAccessModifier: { type: MethodType; accessModifier: AccessModifier; node: ALFullSyntaxTreeNode; }[] = []
        for (const typeClassifiedNode of typeClassifiedNodes) {
            let methodRange = TextRangeExt.createVSCodeRange(typeClassifiedNode.node.fullSpan);
            let fileContent = this.document.getText();
            let identifierNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(typeClassifiedNode.node, FullSyntaxTreeNodeKind.getIdentifierName(), false)!
            let identifierRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(identifierNode.fullSpan))
            let firstPartOfMethodDeclaration = DocumentUtils.getSubstringOfFileByRange(fileContent, new Range(methodRange.start, identifierRange.start))
            if (/local procedure\s+$/i.test(firstPartOfMethodDeclaration))
                nodesWithAccessModifier.push({ type: typeClassifiedNode.type, accessModifier: AccessModifier.local, node: typeClassifiedNode.node })
            else if (/protected procedure\s+$/i.test(firstPartOfMethodDeclaration))
                nodesWithAccessModifier.push({ type: typeClassifiedNode.type, accessModifier: AccessModifier.protected, node: typeClassifiedNode.node })
            else if (/internal procedure\s+$/i.test(firstPartOfMethodDeclaration))
                nodesWithAccessModifier.push({ type: typeClassifiedNode.type, accessModifier: AccessModifier.internal, node: typeClassifiedNode.node })
            else if (/procedure\s+$/i.test(firstPartOfMethodDeclaration))
                nodesWithAccessModifier.push({ type: typeClassifiedNode.type, accessModifier: AccessModifier.public, node: typeClassifiedNode.node })
            else if (/trigger\s+$/i.test(firstPartOfMethodDeclaration))
                nodesWithAccessModifier.push({ type: typeClassifiedNode.type, accessModifier: AccessModifier.local, node: typeClassifiedNode.node })
        }
        return nodesWithAccessModifier;
    }

    public async isInvocationExpression(range: Range): Promise<boolean> {
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
    private sortByName(a: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, b: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }) {
        return a.node.name!.removeQuotes().toLowerCase().localeCompare(b.node.name!.removeQuotes().toLowerCase())
    }
    private sortByAccessModifier(a: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, b: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }) {
        return a.accessModifier.valueOf() - b.accessModifier.valueOf()
    }
    private sortByType(a: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, b: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }) {
        return a.type.valueOf() - b.type.valueOf()
    }
    private filterBySameType_SameAccessModifier(node: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, procedureToInsert: ALProcedure, procedureToInsertType: MethodType): boolean {
        return node.type.valueOf() == procedureToInsertType.valueOf() &&
            node.accessModifier.valueOf() == procedureToInsert.accessModifier.valueOf()
    }
    private filterBySameType_HigherAccessModifier(node: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, procedureToInsert: ALProcedure, procedureToInsertType: MethodType): boolean {
        return node.type.valueOf() == procedureToInsertType.valueOf() &&
            node.accessModifier.valueOf() < procedureToInsert.accessModifier.valueOf()
    }
    private filterByType(node: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, procedureToInsertType: MethodType): boolean {
        return node.type.valueOf() < procedureToInsertType.valueOf()
    }
    private filterByName(node: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, procedureToInsert: ALProcedure): boolean {
        return node.node.name!.removeQuotes().toLowerCase().localeCompare(procedureToInsert.name.removeQuotes().toLowerCase()) <= 0
    }
}