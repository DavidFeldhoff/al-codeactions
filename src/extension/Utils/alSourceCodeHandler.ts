import { Location, Position, Range, Selection, TextDocument, TextEditorRevealType, window } from 'vscode';
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
    public async getPositionToInsertProcedure(procedureToInsert: ALProcedure, sourceLocation: Location, appInsightsEntryProperties: any, config: FindNewProcedureLocation = Config.getFindNewProcedureLocation(this.document.uri)): Promise<Position | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let rootNode: ALFullSyntaxTreeNode = syntaxTree.getRoot();
        let objectNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(rootNode, FullSyntaxTreeNodeKind.getAllObjectKinds(), false);
        let targetObjectNode: ALFullSyntaxTreeNode | undefined = objectNodes.find(objectNode => objectNode.name?.toLowerCase().removeQuotes() == procedureToInsert.ObjectOfProcedure.name.toLowerCase().removeQuotes())
        if (!targetObjectNode)
            Err._throw('Unable to locate target object. Please file an issue on github.')
        let methodOrTriggerNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(targetObjectNode, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()], false)
        let classifiedNodes: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }[] = this.classifyMethodOrTriggerNodes(methodOrTriggerNodes);

        let result: { anchorNode: ALFullSyntaxTreeNode | undefined, userCanceled: boolean } = await this.getAnchorNode(config, procedureToInsert, classifiedNodes, targetObjectNode, sourceLocation, appInsightsEntryProperties)
        if (result.userCanceled)
            return undefined

        if (result.anchorNode) {
            if (result.anchorNode.kind == FullSyntaxTreeNodeKind.getTriggerDeclaration()) {
                let globalVarSections: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(targetObjectNode, [FullSyntaxTreeNodeKind.getGlobalVarSection()], false);
                if (globalVarSections.length > 1)
                    result.anchorNode = globalVarSections.pop()!
            }
            return TextRangeExt.createVSCodeRange(result.anchorNode.fullSpan).end
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
    private async getAnchorNode(config: FindNewProcedureLocation, procedureToInsert: ALProcedure, classifiedNodes: { type: MethodType; accessModifier: AccessModifier; range: Range; node: ALFullSyntaxTreeNode; }[], targetObjectNode: ALFullSyntaxTreeNode, sourceLocation: Location, appInsightsEntryProperties: any): Promise<{ anchorNode: ALFullSyntaxTreeNode | undefined, userCanceled: boolean }> {
        let anchorNode: ALFullSyntaxTreeNode | undefined
        if ([FindNewProcedureLocation['Sort by type, access modifier, name'], FindNewProcedureLocation['Sort by type, access modifier, range']].includes(config)) {
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
        } else if (config == FindNewProcedureLocation['Always ask']) {
            if (classifiedNodes.length > 1)
                return await this.findPositionByAsking(targetObjectNode, classifiedNodes, this.document, sourceLocation, appInsightsEntryProperties)
            else if (classifiedNodes.length == 1)
                anchorNode = classifiedNodes[0].node
        }
        return { anchorNode, userCanceled: false }
    }
    async findPositionByAsking(targetObjectNode: ALFullSyntaxTreeNode, classifiedNodes: { type: MethodType; accessModifier: AccessModifier; range: Range; node: ALFullSyntaxTreeNode; }[], document: TextDocument, sourceLocation: Location, appInsightsEntryProperties: any): Promise<{ anchorNode: ALFullSyntaxTreeNode | undefined, userCanceled: boolean }> {
        classifiedNodes = classifiedNodes.sort((a, b) => {
            if (sourceLocation) {
                if (sourceLocation.uri.fsPath == document.uri.fsPath)
                    if (a.range.contains(sourceLocation.range.start))
                        return -1;
                    else if (b.range.contains(sourceLocation.range.start))
                        return 1;
            }
            return a.range.start.compareTo(b.range.start)
        })
        interface ownQuickPickItem { label: string, detail?: string, range: Range, node: ALFullSyntaxTreeNode }
        let methodQPItems: ownQuickPickItem[] = classifiedNodes.map(entry => {
            let detail: string = document.getText(DocumentUtils.trimRange(document, entry.range)).replace(/\r\n/g, '')
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
                placeHolder: 'Select an anchor after which you want to place your new function.',
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