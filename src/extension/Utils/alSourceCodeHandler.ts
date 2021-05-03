import { Position, Range, TextDocument, window } from 'vscode';
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
    public async getPositionToInsertProcedure(procedureToInsert: ALProcedure, config: FindNewProcedureLocation = Config.getFindNewProcedureLocation(this.document.uri)): Promise<Position | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let rootNode: ALFullSyntaxTreeNode = syntaxTree.getRoot();
        let objectNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(rootNode, FullSyntaxTreeNodeKind.getAllObjectKinds(), false);
        let targetObjectNode: ALFullSyntaxTreeNode | undefined = objectNodes.find(objectNode => objectNode.name?.toLowerCase().removeQuotes() == procedureToInsert.ObjectOfProcedure.name.toLowerCase().removeQuotes())
        if (!targetObjectNode)
            Err._throw('Unable to locate target object. Please file an issue on github.')
        let methodOrTriggerNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(targetObjectNode, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()], true)
        let classifiedNodes: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }[] = this.classifyMethodOrTriggerNodes(methodOrTriggerNodes);

        let nodesPlacedEarlier: ALFullSyntaxTreeNode[] = []
        if (config == FindNewProcedureLocation['Sort by type, access modifier, name']) {
            classifiedNodes = classifiedNodes.sort(this.sortByType_AccessModifier_Name)
            let classifiedNodesPlacedEarlier = classifiedNodes.filter(node => this.filterByType_AccessModifier_Name(node, procedureToInsert))
            nodesPlacedEarlier = classifiedNodesPlacedEarlier.map(entry => entry.node)
        } else if (config == FindNewProcedureLocation['Sort by type, access modifier, range']) {
            classifiedNodes = classifiedNodes.sort(this.sortByType_AccessModifier_Range)
            let classifiedNodesPlacedEarlier = classifiedNodes.filter(node => this.filterByType_AccessModifier_Range(node, procedureToInsert))
            nodesPlacedEarlier = classifiedNodesPlacedEarlier.map(entry => entry.node)
        } else if (config == FindNewProcedureLocation['Always ask']) {
            if (classifiedNodes.length > 0) {
                return await this.findPositionByAsking(targetObjectNode, classifiedNodes, this.document)
            }
        }

        if (nodesPlacedEarlier.length !== 0) {
            let lastNodePlacedEarlier = nodesPlacedEarlier[nodesPlacedEarlier.length - 1]
            if (lastNodePlacedEarlier.kind == FullSyntaxTreeNodeKind.getTriggerDeclaration()) {
                let globalVarSection = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(targetObjectNode, FullSyntaxTreeNodeKind.getGlobalVarSection(), false)
                if (globalVarSection)
                    lastNodePlacedEarlier = globalVarSection
            }
            return TextRangeExt.createVSCodeRange(lastNodePlacedEarlier.fullSpan).end
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
    async findPositionByAsking(targetObjectNode: ALFullSyntaxTreeNode, classifiedNodes: { type: MethodType; accessModifier: AccessModifier; range: Range; node: ALFullSyntaxTreeNode; }[], document: TextDocument): Promise<Position | PromiseLike<Position | undefined> | undefined> {
        classifiedNodes = classifiedNodes.sort((a, b) => a.range.start.compareTo(b.range.start))
        let methodDeclarations: string[] = classifiedNodes.map(entry => {
            let parameterListNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(entry.node, FullSyntaxTreeNodeKind.getParameterList(), false)!
            let parameterListRange: Range = TextRangeExt.createVSCodeRange(parameterListNode.fullSpan)
            let parameterText = document.getText(parameterListRange).replace(/(\r\n|\s+)/g, ' ')
            let methodIdentifierNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(entry.node, FullSyntaxTreeNodeKind.getIdentifierName(), false)!
            let methodIdentifierRange = TextRangeExt.createVSCodeRange(methodIdentifierNode.fullSpan)
            let declarationLineStart = document.getText(new Range(methodIdentifierRange.start.line, 0, methodIdentifierRange.end.line, methodIdentifierRange.end.character)).trimLeft()
            return declarationLineStart + parameterText
        })
        let globalVarItem = 'Global variable section'
        let globalVarSection = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(targetObjectNode, FullSyntaxTreeNodeKind.getGlobalVarSection(), false)
        if (globalVarSection)
            methodDeclarations.push(globalVarItem)
        let methodDeclaration: string | undefined = await window.showQuickPick(methodDeclarations,
            {
                ignoreFocusOut: true,
                placeHolder: 'Select an anchor after which you want to place your new function.'
            })
        if (!methodDeclaration)
            return
        if (methodDeclaration == globalVarItem && globalVarSection)
            return TextRangeExt.createVSCodeRange(globalVarSection.fullSpan).end
        else {
            let index = methodDeclarations.findIndex(declaration => methodDeclaration == declaration)!
            return classifiedNodes[index].range.end;
        }
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
    private sortByType_AccessModifier_Name(a: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, b: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }) {
        let sortByKindResult = a.type.valueOf() - b.type.valueOf()
        if (sortByKindResult !== 0)
            return sortByKindResult
        let sortByAccessModifierResult = a.accessModifier.valueOf() - b.accessModifier.valueOf()
        if (sortByAccessModifierResult !== 0)
            return sortByAccessModifierResult
        return a.node.name!.removeQuotes().toLowerCase().localeCompare(b.node.name!.removeQuotes().toLowerCase())
    }
    private filterByType_AccessModifier_Name(node: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, procedureToInsert: ALProcedure): boolean {
        let procedureToInsertType: MethodType = MethodClassifier.classifyMethodAsType(procedureToInsert)
        return node.type.valueOf() < procedureToInsertType.valueOf() || (
            node.type.valueOf() == procedureToInsertType.valueOf() &&
            node.accessModifier.valueOf() < procedureToInsert.accessModifier.valueOf() || (
                node.type.valueOf() == procedureToInsertType.valueOf() &&
                node.accessModifier.valueOf() == procedureToInsert.accessModifier.valueOf() &&
                node.node.name!.removeQuotes().toLowerCase().localeCompare(procedureToInsert.name.removeQuotes().toLowerCase()) <= 0
            )
        )
    }
    private sortByType_AccessModifier_Range(a: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, b: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }) {
        let sortByKindResult = a.type.valueOf() - b.type.valueOf()
        if (sortByKindResult !== 0)
            return sortByKindResult
        let sortByAccessModifierResult = a.accessModifier.valueOf() - b.accessModifier.valueOf()
        if (sortByAccessModifierResult !== 0)
            return sortByAccessModifierResult
        return a.range.start.compareTo(b.range.start)
    }
    private filterByType_AccessModifier_Range(node: { type: MethodType; accessModifier: AccessModifier, range: Range; node: ALFullSyntaxTreeNode; }, procedureToInsert: ALProcedure): boolean {
        let procedureToInsertType: MethodType = MethodClassifier.classifyMethodAsType(procedureToInsert)
        return node.type.valueOf() < procedureToInsertType.valueOf() || (
            node.type.valueOf() == procedureToInsertType.valueOf() &&
            node.accessModifier.valueOf() <= procedureToInsert.accessModifier.valueOf()
        )
    }
}