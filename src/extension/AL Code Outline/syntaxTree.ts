import * as vscode from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt as TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { ALFullSyntaxTreeNode } from './alFullSyntaxTreeNode';
import { ToolsGetFullSyntaxTreeRequest } from './toolsGetFullSyntaxTreeRequest';
import { ToolsGetFullSyntaxTreeResponse } from './toolsGetFullSyntaxTreeResponse';

export class SyntaxTree {
    private static instances: Map<vscode.TextDocument, SyntaxTree | undefined> = new Map();
    private fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined;
    private documentContentOfCreation: string;
    private constructor(fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined, currentDocumentContent: string) {
        this.fullSyntaxTreeResponse = fullSyntaxTreeResponse;
        this.documentContentOfCreation = currentDocumentContent;
    }
    public static async getInstance(document: vscode.TextDocument): Promise<SyntaxTree> {
        let instance: SyntaxTree | undefined = this.instances.get(document);
        if (!instance || instance.isOutdated(document.getText())) {
            this.instances.set(document, new SyntaxTree(await this.getFullSyntaxTree(document), document.getText()));
        }
        return this.instances.get(document) as SyntaxTree;
    }
    public static clearInstance(document: vscode.TextDocument) {
        let instance: SyntaxTree | undefined = this.instances.get(document);
        if (instance) {
            this.instances.delete(document);
        }
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
    public isOutdated(documentContent: string): boolean {
        return this.documentContentOfCreation !== documentContent;
    }
}