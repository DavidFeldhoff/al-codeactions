import { readFileSync } from 'fs';
import { Position, Range, TextDocument, Uri, workspace } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt as TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { ALFullSyntaxTreeNode } from './alFullSyntaxTreeNode';
import { ToolsGetFullSyntaxTreeRequest } from './toolsGetFullSyntaxTreeRequest';
import { ToolsGetFullSyntaxTreeResponse } from './toolsGetFullSyntaxTreeResponse';

export class SyntaxTree {
    private static instances: Map<string, SyntaxTree | undefined> = new Map();
    private fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined;
    private documentContentOfCreation: string;
    private constructor(fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined, currentDocumentContent: string) {
        this.fullSyntaxTreeResponse = fullSyntaxTreeResponse;
        this.documentContentOfCreation = currentDocumentContent;
    }
    public static async getInstance(document: TextDocument): Promise<SyntaxTree> {
        return this.getInstance2(document.uri.fsPath, document.getText())
    }
    public static async getInstance2(fsPath: string, fileContent?: string): Promise<SyntaxTree> {
        let instance: SyntaxTree | undefined = this.instances.get(fsPath);
        if (!fileContent)
            fileContent = readFileSync(fsPath, { encoding: 'utf8' })
        if (!instance || instance.isOutdated(fileContent)) {
            this.instances.set(fsPath, new SyntaxTree(await this.getFullSyntaxTree(fsPath, fileContent), fileContent));
        }
        return this.instances.get(fsPath) as SyntaxTree;
    }
    public static clearInstance(document: TextDocument) {
        let instance: SyntaxTree | undefined = this.instances.get(document.uri.fsPath);
        if (instance) {
            this.instances.delete(document.uri.fsPath);
        }
    }
    private static async getFullSyntaxTree(fsPath: string, fileContent: string): Promise<ToolsGetFullSyntaxTreeResponse | undefined> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        // let newSymbolPath: number[] = [];
        let projectPath = workspace.getWorkspaceFolder(Uri.file(fsPath))?.uri.fsPath
        if (!projectPath)
            projectPath = fsPath;
        let toolsGetFullSyntaxTreeRequest = new ToolsGetFullSyntaxTreeRequest(fileContent, fsPath, projectPath);
        let fullSyntaxTreeResponse: ToolsGetFullSyntaxTreeResponse | undefined = await azalDevTools.toolsLangServerClient.getFullSyntaxTree(toolsGetFullSyntaxTreeRequest, true);
        return fullSyntaxTreeResponse;
    }

    public findTreeNode(position: Position, searchForNodeKinds?: string[]): ALFullSyntaxTreeNode | undefined {
        if (!this.fullSyntaxTreeResponse || !this.fullSyntaxTreeResponse.root) {
            return undefined;
        }
        return this.findMatchingTreeResponseSymbolRecursive(position, this.fullSyntaxTreeResponse.root, searchForNodeKinds);
    }
    private findMatchingTreeResponseSymbolRecursive(position: Position, fullSyntaxTreeNode: ALFullSyntaxTreeNode, searchForNodeKinds?: string[]): ALFullSyntaxTreeNode | undefined {
        if (!fullSyntaxTreeNode.childNodes) {
            return undefined;
        }
        for (let i = 0; i < fullSyntaxTreeNode.childNodes.length; i++) {
            let cn: ALFullSyntaxTreeNode = fullSyntaxTreeNode.childNodes[i];
            let cnRange: Range = TextRangeExt.createVSCodeRange(cn.fullSpan);
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
    public getRoot(): ALFullSyntaxTreeNode {
        if (!this.fullSyntaxTreeResponse?.root)
            throw new Error('The syntax tree couldn\'t be loaded. Please file an issue on github.');
        return this.fullSyntaxTreeResponse.root;
    }
    public isOutdated(documentContent: string): boolean {
        return this.documentContentOfCreation !== documentContent;
    }
}