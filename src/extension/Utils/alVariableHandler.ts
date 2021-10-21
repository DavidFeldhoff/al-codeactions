import { TextDocument, Range } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from '../AL Code Outline Ext/syntaxTreeExt';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALVariable } from '../Entities/alVariable';
import { ALParameterParser } from '../Entity Parser/alParameterParser';
import { ALVariableParser } from '../Entity Parser/alVariableParser';

export class ALVariableHandler {
    static getRecAndXRecAsALVariable(objectNode: ALFullSyntaxTreeNode, document: TextDocument, range?: Range): { rec: ALVariable | undefined; xRec: ALVariable | undefined } {
        let rec: ALVariable | undefined = this.getRecAsALVariable2(objectNode, document, 'Rec');
        let xRec = undefined
        if (rec && [FullSyntaxTreeNodeKind.getTableObject(), FullSyntaxTreeNodeKind.getPageObject()].includes(objectNode.kind!))
            xRec = new ALVariable('xRec', rec.type)

        if (rec)
            if (objectNode.kind == FullSyntaxTreeNodeKind.getCodeunitObject()) {
                let triggerNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectNode, FullSyntaxTreeNodeKind.getTriggerDeclaration(), false)
                if (!triggerNode || !triggerNode.name || !(triggerNode.name.toLowerCase() == 'onrun') || (!range || (range && !TextRangeExt.createVSCodeRange(triggerNode.fullSpan).contains(range))))
                    rec = undefined
            }
        return { rec, xRec };
    }
    static async getRecAsALVariable(document: TextDocument, variableRange: Range): Promise<ALVariable | undefined> {
        let variableName = document.getText(variableRange); //Rec or xRec

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, variableRange.start)
        if (objectTreeNode)
            return this.getRecAsALVariable2(objectTreeNode, document, variableName);

        return undefined;
    }
    static getRecAsALVariable2(objectNode: ALFullSyntaxTreeNode, document: TextDocument, variableName: string): ALVariable | undefined {
        let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined
        switch (objectNode.kind) {
            case FullSyntaxTreeNodeKind.getCodeunitObject():
                valueOfPropertyTreeNode = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, objectNode, 'TableNo');
                if (valueOfPropertyTreeNode) {
                    let rangeOfTableNo: Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                    return new ALVariable(variableName, 'Record ' + document.getText(rangeOfTableNo), undefined, true).sanitizeName();
                }
                break;
            case FullSyntaxTreeNodeKind.getTableObject():
                let identifierList: ALFullSyntaxTreeNode[] = [];
                ALFullSyntaxTreeNodeExt.collectChildNodes(objectNode, FullSyntaxTreeNodeKind.getIdentifierName(), false, identifierList);
                if (identifierList.length === 1 && identifierList[0].identifier) {
                    return new ALVariable(variableName, 'Record ' + identifierList[0].identifier, undefined, true).sanitizeName();
                }
                break;
            case FullSyntaxTreeNodeKind.getPageObject():
                valueOfPropertyTreeNode = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, objectNode, 'SourceTable');
                if (valueOfPropertyTreeNode) {
                    let rangeOfSourceTable: Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                    return new ALVariable(variableName, 'Record ' + document.getText(rangeOfSourceTable), undefined, true).sanitizeName();
                }
                break;
            case FullSyntaxTreeNodeKind.getRequestPage():
                valueOfPropertyTreeNode = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, objectNode, 'SourceTable');
                if (valueOfPropertyTreeNode) {
                    let rangeOfSourceTable: Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                    return new ALVariable(variableName, 'Record ' + document.getText(rangeOfSourceTable), undefined, true).sanitizeName();
                }
                break;
            default:
                break;
        }
    }
    static getGlobalVariables(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode): ALVariable[] {
        let globalVarSections = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(objectTreeNode, [FullSyntaxTreeNodeKind.getGlobalVarSection()], false);
        let globalVariableNodes: ALFullSyntaxTreeNode[] = [];
        if (globalVarSections)
            for (const globalVarSection of globalVarSections)
                globalVariableNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(globalVarSection, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableDeclarationName()], true);
        let globalVariables: ALVariable[] = ALVariableParser.parseVariableTreeNodeArrayToALVariableArray(document, globalVariableNodes, false);
        return globalVariables
    }
    static getLocalVariables(document: TextDocument, methodNode: ALFullSyntaxTreeNode): ALVariable[] {
        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        let variableNodes: ALFullSyntaxTreeNode[] = [];
        if (varSection)
            variableNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(varSection, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableDeclarationName()], true);
        let localVariables: ALVariable[] = ALVariableParser.parseVariableTreeNodeArrayToALVariableArray(document, variableNodes, false);
        return localVariables
    }
    static async getAvailableVariablesInRange(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode, range: Range): Promise<ALVariable[]> {
        let availableVariables: ALVariable[] = []
        availableVariables = this.getGlobalVariables(document, objectTreeNode);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.findTreeNode(objectTreeNode, range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()])
        if (methodOrTriggerTreeNode) {
            availableVariables = availableVariables.concat(this.getLocalVariables(document, methodOrTriggerTreeNode))

            let parameterList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getParameterList(), false);
            if (parameterList) {
                let parameters: ALVariable[] = [];
                if (parameterList.childNodes)
                    for (const parameterNode of parameterList.childNodes)
                        parameters.push(await ALParameterParser.parseParameterTreeNodeToALVariable(document, parameterNode, true));
                availableVariables = availableVariables.concat(parameters);
            }
        }
        return availableVariables;
    }
}