import { Range, TextDocument } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from '../AL Code Outline Ext/syntaxTreeExt';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALVariable } from "../Entities/alVariable";
import { DocumentUtils } from '../Utils/documentUtils';
import { Err } from '../Utils/Err';

export class ALVariableParser {

    static parseVariableTreeNodeArrayToALVariableArray(document: TextDocument, variableTreeNodes: ALFullSyntaxTreeNode[], sanitizeName: boolean): ALVariable[] {
        let alVariables: ALVariable[] = [];
        for (let i = 0; i < variableTreeNodes.length; i++) {
            switch (variableTreeNodes[i].kind) {
                case FullSyntaxTreeNodeKind.getVariableDeclaration():
                case FullSyntaxTreeNodeKind.getVariableDeclarationName():
                    alVariables.push(this.parseVariableTreeNodeToALVariable(document, variableTreeNodes[i], sanitizeName));
                    break;
                default:
                    Err._throw('Variable should be one of the above kinds.');
            }
        }
        return alVariables;
    }
    //Parses a VariableDeclaration Node or a VariableDeclarationName Node to an object ALVariable
    static parseVariableTreeNodeToALVariable(document: TextDocument, variableNode: ALFullSyntaxTreeNode, sanitizeVarName: boolean = false): ALVariable {
        let memberAttributes: string[] = this.getMemberAttributeTexts(document, variableNode);
        let fullType: string = this.getTypeInfoOfVariableDeclaration(document, variableNode)

        let varSection: ALFullSyntaxTreeNode;
        let variableName: string;
        if (variableNode.kind == FullSyntaxTreeNodeKind.getVariableDeclarationName()) {
            variableName = this.getIdentifierOfVariableDeclarationNameNode(document, variableNode)
            varSection = variableNode.parentNode!.parentNode!
        } else {
            variableName = this.getIdentifierOfVariableDeclarationNode(document, variableNode);
            varSection = variableNode.parentNode!
        }
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined;
        if (varSection.parentNode!.kind! in [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()])
            methodOrTriggerTreeNode = varSection.parentNode!
        let variable: ALVariable = new ALVariable(variableName, fullType, methodOrTriggerTreeNode?.name, false, memberAttributes)
        if (sanitizeVarName)
            variable.sanitizeName();
        return variable;
    }
    static async parseReturnValueTreeNodeToALVariable(document: TextDocument, returnVariableTreeNode: ALFullSyntaxTreeNode, modifyVarNames: boolean): Promise<ALVariable> {
        if (!returnVariableTreeNode.kind || returnVariableTreeNode.kind !== FullSyntaxTreeNodeKind.getReturnValue()) {
            Err._throw('That\'s not a return value tree node.');
        }
        if (returnVariableTreeNode.childNodes && returnVariableTreeNode.childNodes.length === 2) {
            let identifierTreeNode: ALFullSyntaxTreeNode = returnVariableTreeNode.childNodes[0];
            let rangeOfName: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = returnVariableTreeNode.childNodes[1];
            let rangeOfType: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            let variable: ALVariable = new ALVariable(identifierName, type, methodOrTriggerTreeNode?.name, false);
            if (modifyVarNames)
                variable.sanitizeName();
            return variable;
        } else {
            Err._throw('Variable declaration has no child nodes.');
        }
    }
    private static getMemberAttributeTexts(document: TextDocument, variableDeclarationNode: ALFullSyntaxTreeNode): string[] {
        let mainNode: ALFullSyntaxTreeNode = variableDeclarationNode
        if (variableDeclarationNode.parentNode!.kind == FullSyntaxTreeNodeKind.getVariableListDeclaration())
            mainNode = variableDeclarationNode.parentNode!

        let memberAttributeNodes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(mainNode, FullSyntaxTreeNodeKind.getMemberAttribute(), false, memberAttributeNodes);
        let memberAttributeTexts: string[] = []
        for (const memberAttributeNode of memberAttributeNodes) {
            let memberText = document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(memberAttributeNode.fullSpan)));
            memberAttributeTexts.push(memberText);
        }
        return memberAttributeTexts;
    }


    private static getTypeInfoOfVariableDeclaration(document: TextDocument, variableDeclarationNode: ALFullSyntaxTreeNode): string {
        let mainNode: ALFullSyntaxTreeNode = variableDeclarationNode
        if (variableDeclarationNode.parentNode!.kind == FullSyntaxTreeNodeKind.getVariableListDeclaration())
            mainNode = variableDeclarationNode.parentNode!

        let typeNode: ALFullSyntaxTreeNode = mainNode.childNodes![mainNode.childNodes!.length - 1]
        return document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeNode.fullSpan)));
    }
    private static getIdentifierOfVariableDeclarationNameNode(document: TextDocument, variableDeclarationNameNode: ALFullSyntaxTreeNode): string {
        return ALFullSyntaxTreeNodeExt.getIdentifierValue(document, variableDeclarationNameNode, false)!;
    }
    private static getIdentifierOfVariableDeclarationNode(document: TextDocument, variableDeclarationNode: ALFullSyntaxTreeNode): string {
        let identifierNode: ALFullSyntaxTreeNode = variableDeclarationNode.childNodes![variableDeclarationNode.childNodes!.length - 2]
        return document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierNode.fullSpan)));
    }
}