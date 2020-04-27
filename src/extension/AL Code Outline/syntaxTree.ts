import * as vscode from 'vscode';
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { ToolsGetFullSyntaxTreeResponse } from './toolsGetFullSyntaxTreeResponse';
import { ToolsGetFullSyntaxTreeRequest } from './toolsGetFullSyntaxTreeRequest';
import { ALFullSyntaxTreeNode } from './alFullSyntaxTreeNode';
import { TextRangeExt as TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
export class SyntaxTree {
    private static instance: SyntaxTree | undefined;
    private fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined;
    private constructor(fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined) {
        this.fullSyntaxTreeResponse = fullSyntaxTreeResponse;
    }
    public static async getInstance(document: vscode.TextDocument): Promise<SyntaxTree> {
        if (!this.instance) {
            this.instance = new SyntaxTree(await this.getFullSyntaxTree(document));
        }
        return this.instance;
    }
    public static clearInstance() {
        this.instance = undefined;
    }
    private static async getFullSyntaxTree(document: vscode.TextDocument): Promise<ToolsGetFullSyntaxTreeResponse | undefined> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        // let newSymbolPath: number[] = [];
        let toolsGetFullSyntaxTreeRequest = new ToolsGetFullSyntaxTreeRequest(document.getText(), document.uri.fsPath);
        let fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined = await azalDevTools.toolsLangServerClient.getFullSyntaxTree(toolsGetFullSyntaxTreeRequest, true);
        return fullSyntaxTreeResponse;
    }

    public findTreeNode(position: vscode.Position, searchForNodeKinds?: string[]): ALFullSyntaxTreeNode | undefined {
        if (!this.fullSyntaxTreeResponse || !this.fullSyntaxTreeResponse.root) {
            return undefined;
        }
        return this.findMatchingTreeResponseSymbolRecursive(position, this.fullSyntaxTreeResponse.root, searchForNodeKinds);
    }
    private findMatchingTreeResponseSymbolRecursive(position: vscode.Position, fullSyntaxTreeNode: ALFullSyntaxTreeNode, searchForNodeKinds?: string[]): ALFullSyntaxTreeNode | undefined {
        if (!fullSyntaxTreeNode.childNodes) {
            return undefined;
        }
        for (let i = 0; i < fullSyntaxTreeNode.childNodes.length; i++) {
            let cn: ALFullSyntaxTreeNode = fullSyntaxTreeNode.childNodes[i];
            let cnRange: vscode.Range = TextRangeExt.createVSCodeRange(cn.fullSpan);
            if (cnRange?.start.isBeforeOrEqual(position) && cnRange.end.isAfterOrEqual(position)) {
                let deeperResult = this.findMatchingTreeResponseSymbolRecursive(position, cn, searchForNodeKinds);
                if (searchForNodeKinds) {
                    if (!deeperResult || !deeperResult.kind || deeperResult && !searchForNodeKinds.includes(deeperResult.kind)) {
                        if (cn.kind && searchForNodeKinds.includes(cn.kind)) {
                            return cn;
                        }
                        return undefined;
                    }
                }
                return deeperResult ? deeperResult : cn;
            }
        }
        return undefined;
    }
    public collectNodesOfKindXInWholeDocument(searchForNodeKind: string): ALFullSyntaxTreeNode[] {
        if (!this.fullSyntaxTreeResponse || !this.fullSyntaxTreeResponse.root) {
            return [];
        }
        let outList: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(this.fullSyntaxTreeResponse.root, searchForNodeKind, true, outList);
        return outList;
    }
}