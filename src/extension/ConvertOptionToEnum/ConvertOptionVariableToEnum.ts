import { TextDocument, Range, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { DocumentUtils } from "../Utils/documentUtils";
import { IConvertOptionToEnumProvider } from "./IConvertOptionToEnumProvider";

export class ConvertOptionVariableToEnum implements IConvertOptionToEnumProvider {
    document: TextDocument;
    range: Range;
    appInsightsEntryProperties: any = { converted: 'OptionVariable' }
    private syntaxTree: SyntaxTree | undefined
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    canConvertFastCheck(): boolean {
        const wordRange: Range | undefined = this.document.getWordRangeAtPosition(this.range.start)
        if (wordRange) {
            const word: string = this.document.getText(wordRange);
            if (/\bOption\b/i.test(word))
                if (!this.document.lineAt(this.range.start)!.text.trimStart().toLowerCase().startsWith('field'))
                    return true
        }
        return false
    }
    async canConvert(): Promise<boolean> {
        return this.canConvertFastCheck();
    }
    async getOptionValues(): Promise<string[] | undefined> {
        const syntaxTree = await this.loadSyntaxTree();
        const optionDataTypeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), this.range.start, [FullSyntaxTreeNodeKind.getOptionDataType()])
        if (!optionDataTypeNode)
            return
        const optionValues: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(optionDataTypeNode, FullSyntaxTreeNodeKind.getOptionValues(), false);
        if (!optionValues)
            return
        const identifierNameOrEmptyNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(optionValues, [FullSyntaxTreeNodeKind.getIdentifierNameOrEmpty()], false)
        const values: string[] = []
        for (const identifierNameOrEmptyNode of identifierNameOrEmptyNodes)
            if (identifierNameOrEmptyNode.childNodes && identifierNameOrEmptyNode.childNodes[0].identifier)
                values.push(identifierNameOrEmptyNode.childNodes[0].identifier)
            else
                values.push('');
        return values
    }
    async getOptionCaptions(): Promise<string[]> {
        return [];
    }
    async getOptionCaptionTranslations(): Promise<{ language: string; translatedValues: string[]; }[]> {
        return []
    }
    async createWorkspaceEdit(enumName: string): Promise<WorkspaceEdit> {
        const syntaxTree = await this.loadSyntaxTree();
        const edit: WorkspaceEdit = new WorkspaceEdit();
        const optionDataTypeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), this.range.start, [FullSyntaxTreeNodeKind.getOptionDataType()])
        if (optionDataTypeNode)
            edit.replace(this.document.uri, DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(optionDataTypeNode.fullSpan)), `Enum ${enumName}`)
        return edit;
    }
    private async loadSyntaxTree(): Promise<SyntaxTree> {
        if (this.syntaxTree)
            return this.syntaxTree;
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        return this.syntaxTree;
    }
}