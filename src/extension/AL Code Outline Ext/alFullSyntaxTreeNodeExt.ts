import { commands, Location, Range, TextDocument, workspace } from 'vscode';
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { DocumentUtils } from '../Utils/documentUtils';
import { FullSyntaxTreeNodeKind } from './fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from './syntaxTreeExt';
import { TextRangeExt } from './textRangeExt';

export class ALFullSyntaxTreeNodeExt {
    public static collectChildNodes(treeNode: ALFullSyntaxTreeNode, kindOfSyntaxTreeNode: string, searchAllLevels: boolean, outList: ALFullSyntaxTreeNode[]) {
        if (treeNode.childNodes) {
            for (let i = 0; i < treeNode.childNodes.length; i++) {
                if (treeNode.childNodes[i].kind === kindOfSyntaxTreeNode) {
                    outList.push(treeNode.childNodes[i]);
                }
                if (searchAllLevels) {
                    this.collectChildNodes(treeNode.childNodes[i], kindOfSyntaxTreeNode, searchAllLevels, outList);
                }
            }
        }
    }
    public static collectChildNodesOfKinds(treeNode: ALFullSyntaxTreeNode, searchForNodeKinds: string[], searchAllLevels: boolean): ALFullSyntaxTreeNode[] {
        let outList: ALFullSyntaxTreeNode[] = [];
        for (let searchForNodeKind of searchForNodeKinds)
            ALFullSyntaxTreeNodeExt.collectChildNodes(treeNode, searchForNodeKind, searchAllLevels, outList);
        return outList;
    }
    public static getFirstChildNodeOfKind(treeNode: ALFullSyntaxTreeNode, kindOfSyntaxTreeNode: string, searchAllLevels: boolean): ALFullSyntaxTreeNode | undefined {
        let outList: ALFullSyntaxTreeNode[] = [];
        this.collectChildNodes(treeNode, kindOfSyntaxTreeNode, searchAllLevels, outList);
        if (outList.length === 0) {
            return undefined;
        } else {
            return outList[0];
        }
    }
    public static getIdentifierValue(document: TextDocument, node: ALFullSyntaxTreeNode, removeQuotes: boolean): string | undefined {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(node, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!identifierTreeNode)
            return undefined;

        let identifierNameWithQuotes: string = document.getText(TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan)).trim();
        if (removeQuotes)
            return identifierNameWithQuotes.removeQuotes()
        else
            return identifierNameWithQuotes;
    }

    public static getPathToTreeNode(mainNode: ALFullSyntaxTreeNode, childNode: ALFullSyntaxTreeNode): number[] {
        let path: number[] = [];
        this.getPathToTreeNodeRecursive(mainNode, childNode, path);
        return path;
    }
    private static getPathToTreeNodeRecursive(mainNode: ALFullSyntaxTreeNode, childNode: ALFullSyntaxTreeNode, outList: number[]) {
        if (childNode === mainNode) {
            outList = outList.reverse();
            return;
        }
        if (childNode.parentNode) {
            let index: number | undefined = childNode.parentNode.childNodes?.findIndex(cn => cn.fullSpan === childNode.fullSpan && cn.kind === childNode.kind);
            if (index !== undefined && index !== -1) {
                outList.push(index);
            }
            this.getPathToTreeNodeRecursive(mainNode, childNode.parentNode, outList);
        }
    }

    public static reduceLevels(document: TextDocument, node: ALFullSyntaxTreeNode, lookToLeft: boolean, maxReduce?: number): ALFullSyntaxTreeNode {
        if (maxReduce === 0)
            return node;
        let allowedCharacters: string[] = ['', ';'];
        if (node.parentNode) {
            if (lookToLeft) {
                if (node.fullSpan && node.fullSpan.start && node.parentNode.fullSpan && node.parentNode.fullSpan.start) {
                    let rangeBeforeNode = new Range(
                        node.parentNode.fullSpan.start.line,
                        node.parentNode.fullSpan.start.character,
                        node.fullSpan.start.line,
                        node.fullSpan.start.character);
                    let textBeforeNode = document.getText(rangeBeforeNode);
                    if (allowedCharacters.includes(textBeforeNode.trim())) {
                        return this.reduceLevels(document, node.parentNode, lookToLeft, maxReduce ? --maxReduce : undefined);
                    }
                }
            } else {
                if (node.fullSpan && node.fullSpan.end && node.parentNode.fullSpan && node.parentNode.fullSpan.end) {
                    let rangeAfterNode = new Range(
                        node.fullSpan.end.line,
                        node.fullSpan.end.character,
                        node.parentNode.fullSpan.end.line,
                        node.parentNode.fullSpan.end.character);
                    let textAfterNode = document.getText(rangeAfterNode);
                    if (allowedCharacters.includes(textAfterNode.trim())) {
                        return this.reduceLevels(document, node.parentNode, lookToLeft, maxReduce ? --maxReduce : undefined);
                    }
                }
            }
        }
        return node;
    }
    public static getNodeByPath(mainNode: ALFullSyntaxTreeNode, path: number[]): ALFullSyntaxTreeNode {
        let node = mainNode;
        path.forEach(index => {
            node = (node.childNodes as ALFullSyntaxTreeNode[])[index];
        });
        return node;
    }
    public static getValueOfPropertyName(document: TextDocument, mainNode: ALFullSyntaxTreeNode, propertyName: string): ALFullSyntaxTreeNode | undefined {
        let propertyLists: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(mainNode, FullSyntaxTreeNodeKind.getPropertyList(), false, propertyLists);
        if (propertyLists.length === 1) {
            let propertyList: ALFullSyntaxTreeNode = propertyLists[0];
            let properties: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(propertyList, FullSyntaxTreeNodeKind.getProperty(), false, properties);
            if (properties.length > 0) {
                let propertiesOfSearchedProperty: ALFullSyntaxTreeNode[] = properties.filter(property =>
                    property.fullSpan && property.childNodes &&
                    document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(property.childNodes[0].fullSpan))).toLowerCase() === propertyName.trim().toLowerCase());
                if (propertiesOfSearchedProperty.length > 0) {
                    let propertyOfSearchedProperty: ALFullSyntaxTreeNode = propertiesOfSearchedProperty[0];
                    if (propertyOfSearchedProperty.childNodes && propertyOfSearchedProperty.childNodes.length === 2) {
                        return propertyOfSearchedProperty.childNodes[1];
                    }
                }
            }
        }
        return undefined;
    }
    public static async getBaseTableLocation(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode): Promise<Location | undefined> {
        let validKinds: FullSyntaxTreeNodeKind[] = [FullSyntaxTreeNodeKind.getPageObject(), FullSyntaxTreeNodeKind.getRequestPage(), FullSyntaxTreeNodeKind.getPageExtensionObject(), FullSyntaxTreeNodeKind.getTableExtensionObject(), FullSyntaxTreeNodeKind.getCodeunitObject()];
        if (!objectTreeNode.kind || !validKinds.includes(objectTreeNode.kind))
            return undefined;
        if (objectTreeNode.kind == FullSyntaxTreeNodeKind.getTableExtensionObject())
            return await this.getExtendedObjectLocation(document, objectTreeNode);
        //preprocess pageExtension
        if (objectTreeNode.kind == FullSyntaxTreeNodeKind.getPageExtensionObject()) {
            let extendedObjectLocation = await this.getExtendedObjectLocation(document, objectTreeNode);
            if (!extendedObjectLocation)
                return undefined;
            let extendedObjectDoc: TextDocument = await workspace.openTextDocument(extendedObjectLocation.uri);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(extendedObjectDoc);
            objectTreeNode = SyntaxTreeExt.getObjectTreeNode(syntaxTree, extendedObjectLocation.range.start) as ALFullSyntaxTreeNode;
            document = extendedObjectDoc;
            if (!objectTreeNode.kind)
                return undefined;
        }
        let propertyTreeNode: ALFullSyntaxTreeNode | undefined
        if ([FullSyntaxTreeNodeKind.getPageObject(), FullSyntaxTreeNodeKind.getRequestPage()].includes(objectTreeNode.kind))
            propertyTreeNode = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, objectTreeNode, 'SourceTable');
        if ([FullSyntaxTreeNodeKind.getCodeunitObject()].includes(objectTreeNode.kind))
            propertyTreeNode = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, objectTreeNode, 'TableNo');
        if (propertyTreeNode) {
            let rangeOfPropertyValueTreeNode: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(propertyTreeNode.fullSpan));
            let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, rangeOfPropertyValueTreeNode.start);
            if (locations) {
                return locations[0];
            }
        }
    }
    static async getExtendedObjectLocation(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode): Promise<Location | undefined> {
        if (!objectTreeNode.kind || ![FullSyntaxTreeNodeKind.getTableExtensionObject(), FullSyntaxTreeNodeKind.getPageExtensionObject()].includes(objectTreeNode.kind))
            return undefined;
        let objectReference: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getObjectReference(), false);
        if (!objectReference)
            return undefined;
        let objectReferenceRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(objectReference.fullSpan));
        let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, objectReferenceRange.start);
        if (locations && locations.length > 0)
            return locations[0];
    }
    static async getExtendedObject(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode): Promise<ALFullSyntaxTreeNode | undefined> {
        let location: Location | undefined = await this.getExtendedObjectLocation(document, objectTreeNode);
        if (!location)
            return undefined;
        let extendedObjectDoc: TextDocument = await workspace.openTextDocument(location.uri);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(extendedObjectDoc);
        return SyntaxTreeExt.getObjectTreeNode(syntaxTree, location.range.start) as ALFullSyntaxTreeNode;
    }
}