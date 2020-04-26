import * as vscode from 'vscode';
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { downloadAndUnzipVSCode } from "vscode-test";

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
            let index: number | undefined = childNode.parentNode.childNodes?.findIndex(cn => cn.fullSpan === childNode.fullSpan && cn.kind === childNode.kind && cn.name === childNode.name);
            if (index !== undefined && index !== -1) {
                outList.push(index);
            }
            this.getPathToTreeNodeRecursive(mainNode, childNode.parentNode, outList);
        }
    }

    public static reduceLevels(document: vscode.TextDocument, node: ALFullSyntaxTreeNode, lookToLeft: boolean): ALFullSyntaxTreeNode {
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
                        return this.reduceLevels(document, node.parentNode, lookToLeft);
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
                        return this.reduceLevels(document, node.parentNode, lookToLeft);
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
}