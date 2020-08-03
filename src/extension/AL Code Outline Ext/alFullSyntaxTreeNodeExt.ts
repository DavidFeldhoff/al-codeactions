import * as vscode from 'vscode';
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { downloadAndUnzipVSCode } from "vscode-test";
import { FullSyntaxTreeNodeKind } from './fullSyntaxTreeNodeKind';
import { TextRangeExt } from './textRangeExt';
import { DocumentUtils } from '../Utils/documentUtils';

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
    public static getFirstChildNodeOfKind(treeNode: ALFullSyntaxTreeNode, kindOfSyntaxTreeNode: string, searchAllLevels: boolean): ALFullSyntaxTreeNode | undefined {
        let outList: ALFullSyntaxTreeNode[] = [];
        this.collectChildNodes(treeNode, kindOfSyntaxTreeNode, searchAllLevels, outList);
        if (outList.length === 0) {
            return undefined;
        } else {
            return outList[0];
        }
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

    public static reduceLevels(document: vscode.TextDocument, node: ALFullSyntaxTreeNode, lookToLeft: boolean, maxReduce?: number): ALFullSyntaxTreeNode {
        if (maxReduce === 0)
            return node;
        let allowedCharacters: string[] = ['', ';'];
        if (node.parentNode) {
            if (lookToLeft) {
                if (node.fullSpan && node.fullSpan.start && node.parentNode.fullSpan && node.parentNode.fullSpan.start) {
                    let rangeBeforeNode = new vscode.Range(
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
                    let rangeAfterNode = new vscode.Range(
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
    public static getValueOfPropertyName(document: vscode.TextDocument, mainNode: ALFullSyntaxTreeNode, propertyName: string): ALFullSyntaxTreeNode | undefined {
        let propertyLists: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(mainNode, FullSyntaxTreeNodeKind.getPropertyList(), false, propertyLists);
        if (propertyLists.length === 1) {
            let propertyList: ALFullSyntaxTreeNode = propertyLists[0];
            let properties: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(propertyList, FullSyntaxTreeNodeKind.getProperty(), false, properties);
            if (properties.length > 0) {
                let propertiesOfSearchedProperty: ALFullSyntaxTreeNode[] = properties.filter(property =>
                    property.fullSpan &&
                    document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(property.fullSpan))).toLowerCase() === propertyName.trim().toLowerCase());
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
}