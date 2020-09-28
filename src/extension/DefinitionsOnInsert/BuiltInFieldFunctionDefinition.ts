import { TextDocument, Range, Location, commands, Position, workspace } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ObjectDesignerExt } from "../ALObjectDesigner/ObjectDesignerExt";
import { DocumentUtils } from "../Utils/documentUtils";
import { BuiltInFunctionDefinitionInterface } from "./BuiltInFunctionDefinitionInterface";

export class BuiltInFieldFunctionDefinition implements BuiltInFunctionDefinitionInterface {
    builtInFunction: string = '';
    location: Location | undefined;

    getBuiltInFunctionsSupported(): string[] {
        return ['validate'];
    }
    setBuiltInFunction(builtInFunction: string): void {
        this.builtInFunction = builtInFunction;
    }
    async findLocation(document: TextDocument, wordRange: Range): Promise<boolean> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let treeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(wordRange.end.translate(0, 1), [FullSyntaxTreeNodeKind.getIdentifierName()]);
        if (treeNode) {
            let identifierTreeNode: ALFullSyntaxTreeNode;
            if (treeNode.parentNode && treeNode.parentNode.kind == FullSyntaxTreeNodeKind.getMemberAccessExpression())
                identifierTreeNode = (treeNode.parentNode.childNodes as ALFullSyntaxTreeNode[])[1];
            else
                identifierTreeNode = treeNode;
            let identifierRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, identifierRange.start);
            if (locations && locations.length == 1) {
                this.location = locations[0];
                return true;
            }
        }
        return false;
    }
    async getTriggeredNodeLocations(): Promise<Location[]> {
        if (!this.location)
            return [];

        let validTriggers: string[] = [
            'onvalidate',
            'onbeforevalidate',
            'onaftervalidate'
        ];
        let locations: Location[] = [];

        let document: TextDocument = await workspace.openTextDocument(this.location.uri);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let triggerTreeNodes: ALFullSyntaxTreeNode[] = [];

        let fieldTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.location.range.start, [FullSyntaxTreeNodeKind.getField()]);
        if (!fieldTreeNode)
            return [];
        let fieldName: string = ALFullSyntaxTreeNodeExt.getIdentifierValue(document, fieldTreeNode, true) as string;

        ALFullSyntaxTreeNodeExt.collectChildNodes(fieldTreeNode, FullSyntaxTreeNodeKind.getTriggerDeclaration(), false, triggerTreeNodes);
        for (const triggerTreeNode of triggerTreeNodes) {
            let identifierTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(triggerTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
            let identifierRange: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
            let triggerName: string = document.getText(identifierRange);
            if (validTriggers.includes(triggerName.toLowerCase()))
                locations.push(new Location(document.uri, identifierRange));
        }

        let locationsOfTableExtensions: Location[] = await this.getTriggersOfTableExtensions(this.location, fieldName, validTriggers);
        locations = locations.concat(locationsOfTableExtensions);

        return locations;
    }
    async getTriggersOfTableExtensions(location: Location, fieldName: string, validTriggers: string[]): Promise<Location[]> {
        let locations: Location[] = [];
        let document: TextDocument = await workspace.openTextDocument(location.uri);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let tableTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(location.range.start, [FullSyntaxTreeNodeKind.getTableObject()]);
        if (tableTreeNode) {
            let tableName: string | undefined = ALFullSyntaxTreeNodeExt.getIdentifierValue(document, tableTreeNode, true) as string;
            let tableExtensionDocuments: TextDocument[] = await ObjectDesignerExt.getTableExtensions(tableName);
            for (const tableExtensionDocument of tableExtensionDocuments) {
                let syntaxTreeExtension: SyntaxTree = await SyntaxTree.getInstance(tableExtensionDocument);
                let fieldModifications: ALFullSyntaxTreeNode[] = syntaxTreeExtension.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getFieldModification());
                let fieldModification: ALFullSyntaxTreeNode | undefined = fieldModifications.find(fieldMod => fieldName.toLowerCase() == (ALFullSyntaxTreeNodeExt.getIdentifierValue(tableExtensionDocument, fieldMod, true) as string).toLowerCase())
                if (fieldModification) {
                    let triggers: ALFullSyntaxTreeNode[] = [];
                    ALFullSyntaxTreeNodeExt.collectChildNodes(fieldModification, FullSyntaxTreeNodeKind.getTriggerDeclaration(), false, triggers)
                    triggers = triggers.filter(trigger => validTriggers.includes((ALFullSyntaxTreeNodeExt.getIdentifierValue(tableExtensionDocument, trigger, true) as string).toLowerCase()))
                    for (const trigger of triggers) {
                        let identifierTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(trigger, FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
                        let identifierRange: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
                        locations.push(new Location(tableExtensionDocument.uri, identifierRange))
                    }
                }
            }
        }
        return locations;
    }
    async getTableName(location: Location): Promise<string | undefined> {
        let document: TextDocument = await workspace.openTextDocument(location.uri);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let tableTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(location.range.start, [FullSyntaxTreeNodeKind.getTableObject()]);
        if (tableTreeNode)
            return ALFullSyntaxTreeNodeExt.getIdentifierValue(document, tableTreeNode, true);
    }
}