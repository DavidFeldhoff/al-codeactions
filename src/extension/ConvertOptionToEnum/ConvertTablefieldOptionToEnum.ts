import { TextDocument, Range, WorkspaceEdit, workspace } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { Config } from "../Utils/config";
import { DocumentUtils } from "../Utils/documentUtils";
import { IConvertOptionToEnumProvider } from "./IConvertOptionToEnumProvider";

export class ConvertTablefieldOptionToEnum implements IConvertOptionToEnumProvider {
    document: TextDocument;
    fieldTreeNode: ALFullSyntaxTreeNode | undefined;
    range: Range;
    appInsightsEntryProperties: any = {converted: 'Tablefield Option'}
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range
    }
    canConvertFastCheck(): boolean {
        const lineText: string = this.document.lineAt(this.range.start.line).text;
        const regexTableField = /field\(\d+\s*;\s*("[^"]+"|\w+)\s*;\s*Option\s*\)/i
        if (regexTableField.test(lineText))
            return true;
        return false
    }
    async canConvert(): Promise<boolean> {
        const syntaxTree = await SyntaxTree.getInstance(this.document);
        this.fieldTreeNode = syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getField()])
        if (!this.fieldTreeNode || !this.fieldTreeNode.childNodes)
            return false
        const { optionValues } = this.getTypes();
        return optionValues !== undefined
    }
    async createWorkspaceEdit(enumName: string): Promise<WorkspaceEdit> {
        const { optionDataType, optionMembersValueNode, optionCaptionValueNode } = this.getTypes();
        const edit = new WorkspaceEdit()
        edit.replace(this.document.uri, TextRangeExt.createVSCodeRange(optionDataType!.fullSpan), `Enum ${enumName}`)
        edit.delete(this.document.uri, TextRangeExt.createVSCodeRange(optionMembersValueNode!.parentNode!.fullSpan))
        if (optionCaptionValueNode)
            edit.delete(this.document.uri, TextRangeExt.createVSCodeRange(optionCaptionValueNode.parentNode!.fullSpan))
        return edit;
    }
    private getTypes(): { optionDataType: ALFullSyntaxTreeNode | undefined, optionMembersValueNode: ALFullSyntaxTreeNode | undefined, optionValues: ALFullSyntaxTreeNode | undefined, optionCaptionValueNode: ALFullSyntaxTreeNode | undefined } {
        let optionDataType: ALFullSyntaxTreeNode | undefined = this.fieldTreeNode!.childNodes!.find(node => node.kind == FullSyntaxTreeNodeKind.getOptionDataType())
        let optionMembersValueNode: ALFullSyntaxTreeNode | undefined
        let optionValues: ALFullSyntaxTreeNode | undefined
        if (optionDataType) {
            optionMembersValueNode = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(this.document, this.fieldTreeNode!, 'OptionMembers')
            if (optionMembersValueNode)
                optionValues = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(optionMembersValueNode, FullSyntaxTreeNodeKind.getOptionValues(), false)
        }
        let optionCaptionValueNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(this.document, this.fieldTreeNode!, 'OptionCaption')
        return { optionDataType, optionMembersValueNode, optionValues, optionCaptionValueNode }
    }
    async getOptionValues(): Promise<string[] | undefined> {
        const { optionValues } = this.getTypes();
        if (!optionValues)
            return undefined
        let identifierNameOrEmptyNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(optionValues, [FullSyntaxTreeNodeKind.getIdentifierNameOrEmpty()], false)
        return identifierNameOrEmptyNodes.map(entry => entry.childNodes && entry.childNodes[0].identifier ? entry.childNodes[0].identifier : '');
    }
    async getOptionCaptions(): Promise<string[]> {
        let optionCaptionValueNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(this.document, this.fieldTreeNode!, 'OptionCaption')
        let optionCaptionStrings: string[] = []
        if (optionCaptionValueNode && optionCaptionValueNode.kind == FullSyntaxTreeNodeKind.getLabelPropertyValue()) {
            let labelNode: ALFullSyntaxTreeNode = optionCaptionValueNode.childNodes![0]
            if (labelNode.childNodes) {
                let stringLiteralValueNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(labelNode, FullSyntaxTreeNodeKind.getStringLiteralValue(), false);
                if (stringLiteralValueNode) {
                    let optionCaptionString: string | undefined = this.document.getText(DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(stringLiteralValueNode.fullSpan)))
                    optionCaptionStrings = optionCaptionString.split(',');
                    for (let i = 0; optionCaptionStrings.length > i; i++)
                        optionCaptionStrings[i] = `'${optionCaptionStrings[i].replace(/^'?(.*?)'?$/, '$1')}'`
                }
            }
        }
        return optionCaptionStrings;
    }
    async getOptionCaptionTranslations(): Promise<{ language: string, translatedValues: string[] }[]> {
        let optionCaptionValueNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(this.document, this.fieldTreeNode!, 'OptionCaption')
        if (optionCaptionValueNode && optionCaptionValueNode.kind == FullSyntaxTreeNodeKind.getLabelPropertyValue()) {
            let labelNode: ALFullSyntaxTreeNode = optionCaptionValueNode.childNodes![0]
            if (labelNode.childNodes)
                return this.getTranslationInComments(labelNode, this.appInsightsEntryProperties);
        }
        return []
    }
    private getTranslationInComments(labelNode: ALFullSyntaxTreeNode, appInsightsEntryProperties: any): { language: string; translatedValues: string[]; }[] {
        if (!Config.getCommentsContainTranslations(this.document.uri))
            return []
        let translations: { language: string; translatedValues: string[]; }[] = []
        let commaSeparatedIdentifierEqualsLiteralList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(labelNode, FullSyntaxTreeNodeKind.getCommaSeparatedIdentifierEqualsLiteralList(), false);
        if (commaSeparatedIdentifierEqualsLiteralList) {
            let commaSeparatedIdentifierEqualsLiteralListText = this.document.getText(TextRangeExt.createVSCodeRange(commaSeparatedIdentifierEqualsLiteralList.fullSpan));
            if (commaSeparatedIdentifierEqualsLiteralListText.toLowerCase().startsWith('comment')) {
                let stringLiteralValueNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(commaSeparatedIdentifierEqualsLiteralList, FullSyntaxTreeNodeKind.getStringLiteralValue(), true);
                if (stringLiteralValueNode) {
                    let commentText = this.document.getText(TextRangeExt.createVSCodeRange(stringLiteralValueNode.fullSpan));
                    let regex = /'[A-Z]{3}="[^"]+"(,[A-Z]{3}="[^"]+")*'/i;
                    if (regex.test(commentText)) {
                        regex = /\b([A-Z]{3})\b="/g;
                        let regexMatches = commentText.match(regex);
                        if (regexMatches)
                            for (let regexMatch of regexMatches) {
                                let languageCode = regexMatch.substring(0, 3);
                                regex = new RegExp(`${languageCode}="([^"]+)"`);
                                let languageTranslationMatch = regex.exec(commentText);
                                if (languageTranslationMatch)
                                    translations.push({
                                        language: languageCode,
                                        translatedValues: languageTranslationMatch[1].split(',')
                                    });
                            }
                    } else {
                        const workspaceConfig = workspace.getConfiguration("xliffSync");
                        if (!workspaceConfig.get<boolean>("parseFromDeveloperNote"))
                            return []
                        let separator: string | undefined = workspaceConfig.get("parseFromDeveloperNoteSeparator");
                        if (!separator)
                            separator = "|"
                        let regex = new RegExp(`[a-zA-Z]{2}-[a-zA-Z]{2}=.*`, "i")
                        if (regex.test(commentText)) {
                            regex = /\b([a-zA-Z]{2}-[a-zA-Z]{2})\b=/g;
                            let regexMatches = commentText.match(regex);
                            if (regexMatches)
                                for (let regexMatch of regexMatches) {
                                    let languageCode = regexMatch.substring(0, 5)
                                    let commentTextStartingFromLanguageCode = commentText.substring(commentText.indexOf(`${languageCode}=`) + `${languageCode}=`.length)
                                    if (commentTextStartingFromLanguageCode.indexOf(separator) >= 0)
                                        commentTextStartingFromLanguageCode = commentTextStartingFromLanguageCode.substring(0, commentTextStartingFromLanguageCode.indexOf(separator))
                                    else if (commentTextStartingFromLanguageCode.endsWith('\''))
                                        commentTextStartingFromLanguageCode = commentTextStartingFromLanguageCode.substring(0, commentTextStartingFromLanguageCode.length - 1)
                                    translations.push({
                                        language: languageCode,
                                        translatedValues: commentTextStartingFromLanguageCode.split(',')
                                    });
                                }
                        }
                    }
                }
            }
        }
        appInsightsEntryProperties.translationInComments = translations.length > 0
        return translations;
    }
}