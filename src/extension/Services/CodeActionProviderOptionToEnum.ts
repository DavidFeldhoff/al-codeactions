import { ICRSExtensionPublicApi } from "crs-al-language-extension-api";
import { writeFileSync } from "fs";
import { join, parse } from "path";
import { CodeAction, CodeActionKind, commands, CompletionItem, CompletionItemKind, CompletionList, extensions, Range, TextDocument, ViewColumn, window, workspace, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { AppInsights, EventName } from "../ApplicationInsights/applicationInsights";
import { ALCodeOutlineExtension } from "../devToolsExtensionContext";
import { Command } from '../Entities/Command';
import { Config } from "../Utils/config";
import { DocumentUtils } from '../Utils/documentUtils';
import { ICodeActionProvider } from "./ICodeActionProvider";

export class CodeActionProviderOptionToEnum implements ICodeActionProvider {
    range: Range;
    document: TextDocument;
    syntaxTree: SyntaxTree | undefined;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(): Promise<boolean> {
        let lineText: string = this.document.lineAt(this.range.start.line).text;
        let regex = /field\(\d+\s*;\s*("[^"]+"|\w+)\s*;\s*Option\s*\)/i
        return regex.test(lineText);
    }
    async createCodeActions(): Promise<CodeAction[]> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        let fieldTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getField()])
        if (!fieldTreeNode || !fieldTreeNode.childNodes)
            return []
        let optionDataType: ALFullSyntaxTreeNode | undefined = fieldTreeNode.childNodes.find(node => node.kind == FullSyntaxTreeNodeKind.getOptionDataType())
        if (!optionDataType)
            return []
        let optionMembers: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(this.document, fieldTreeNode, 'OptionMembers')
        if (!optionMembers)
            return []
        let optionValues: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(optionMembers, FullSyntaxTreeNodeKind.getOptionValues(), false)
        if (!optionValues)
            return []

        let codeAction: CodeAction = new CodeAction('Refactor to enum', CodeActionKind.RefactorExtract);
        codeAction.command = {
            command: Command.refactorOptionToEnum,
            arguments: [this.document, this.range, fieldTreeNode],
            title: 'Refactor to enum'
        };
        return [codeAction];
    }
    async runCommand(fieldTreeNode: ALFullSyntaxTreeNode) {
        let appInsightsEntryProperties: any = {};
        let enumName: string | undefined = await window.showInputBox({ prompt: 'Please specify a name for the new enum' })
        if (!enumName)
            return []
        if (enumName.includes(' ') && !(enumName.startsWith('"') && enumName.endsWith('"')))
            enumName = `"${enumName.replace(/"/g, '')}"`

        let optionDataType: ALFullSyntaxTreeNode | undefined = fieldTreeNode.childNodes!.find(node => node.kind == FullSyntaxTreeNodeKind.getOptionDataType())
        if (!optionDataType)
            return []
        let optionMembersValueNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(this.document, fieldTreeNode, 'OptionMembers')
        if (!optionMembersValueNode)
            return []
        let optionValues: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(optionMembersValueNode, FullSyntaxTreeNodeKind.getOptionValues(), false)
        if (!optionValues)
            return []
        let identifierNameOrEmptyNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(optionValues, [FullSyntaxTreeNodeKind.getIdentifierNameOrEmpty()], false)

        let optionCaptionValueNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(this.document, fieldTreeNode, 'OptionCaption')
        let optionCaptionStrings: string[] | undefined
        let translations: { language: string, translatedValues: string[] }[] = []
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
                if (labelNode.childNodes.length > 0)
                    translations = this.getTranslationInComments(labelNode, appInsightsEntryProperties);
            }
        }

        let baseFolder: string = parse(this.document.uri.fsPath).dir
        let alCodeOutlineApi = (await ALCodeOutlineExtension.getInstance()).getAPI()
        let enumId = await alCodeOutlineApi.toolsLangServerClient.getNextObjectId(baseFolder, "enum");
        appInsightsEntryProperties.enumIdReceivedFromAZALDevTools = enumId > 0

        let alEnum: alEnum = {
            id: enumId,
            name: enumName,
            properties: [new alEnumProperty(alPropertyName.Extensible, false)],
            values: []
        }
        for (let i = 0; i < identifierNameOrEmptyNodes.length; i++) {
            if (identifierNameOrEmptyNodes[i].childNodes) {
                let enumValueName = ALFullSyntaxTreeNodeExt.getIdentifierValue(this.document, identifierNameOrEmptyNodes[i], false)!
                let enumProperties: alEnumValueProperty[] = []
                if (optionCaptionStrings && optionCaptionStrings.length > i) {
                    let caption = optionCaptionStrings[i]
                    if (translations.length > 0)
                        caption += this.addCommentTranslationText(translations, i);
                    if (caption == `' '`)
                        caption += ', Locked = true'

                    enumProperties.push(new alEnumValueProperty(alPropertyName.Caption, caption))
                }

                alEnum.values.push({
                    id: i,
                    name: enumValueName,
                    properties: enumProperties
                })
            }
        }

        let textForEnumObject: string = this.getTextToWriteEnumObject(alEnum);
        let crsApi: ICRSExtensionPublicApi = extensions.getExtension('waldo.crs-al-language-extension')?.exports;
        let fileName = crsApi.ObjectNamesApi.GetObjectFileName('enum', alEnum.id.toString(), alEnum.name)
        let filePath = join(baseFolder, fileName);
        writeFileSync(filePath, textForEnumObject, { encoding: 'utf8' });

        let enumDocument: TextDocument = await workspace.openTextDocument(filePath);
        if (alEnum.id == 0)
            await this.tryToFixWrongId(enumDocument);

        let edit: WorkspaceEdit = new WorkspaceEdit();
        edit.replace(this.document.uri, TextRangeExt.createVSCodeRange(optionDataType.fullSpan), `Enum ${alEnum.name}`)
        edit.delete(this.document.uri, TextRangeExt.createVSCodeRange(optionMembersValueNode.parentNode!.fullSpan))
        if (optionCaptionValueNode)
            edit.delete(this.document.uri, TextRangeExt.createVSCodeRange(optionCaptionValueNode.parentNode!.fullSpan))
        await workspace.applyEdit(edit);
        AppInsights.getInstance().trackEvent(EventName.ConvertOptionToEnum, appInsightsEntryProperties)

        window.showTextDocument(enumDocument, ViewColumn.Beside);
    }
    async tryToFixWrongId(enumDocument: TextDocument) {
        let nextIDCompletionItem: CompletionItem | undefined;
        let timeStarted: Date = new Date();
        let currentIdRange = new Range(0, 'enum '.length, 0, 'enum 0'.length);
        do {
            let completionList: CompletionList | undefined = await commands.executeCommand('vscode.executeCompletionItemProvider', enumDocument.uri, currentIdRange.start);
            if (!completionList)
                return undefined;
            nextIDCompletionItem = completionList.items.find(item => item.kind && item.kind == CompletionItemKind.Reference)
            let currentTime: Date = new Date()
            let millisecondsAlreadyRan: number = currentTime.getTime() - timeStarted.getTime();
            let secondsRan: number = millisecondsAlreadyRan / 1000
            if (secondsRan > 5)
                break;
        } while (!nextIDCompletionItem);
        if (nextIDCompletionItem) {
            let edit: WorkspaceEdit = new WorkspaceEdit();
            edit.replace(enumDocument.uri, currentIdRange, nextIDCompletionItem.label)
            await workspace.applyEdit(edit);
            let onSaveAlFileAction: string | undefined = workspace.getConfiguration('CRS', window.activeTextEditor?.document.uri).get('OnSaveAlFileAction', 'DoNothing');
            if (onSaveAlFileAction && !['reorganize', 'rename'].includes(onSaveAlFileAction.toLowerCase()))
                await enumDocument.save();
        }
    }
    private addCommentTranslationText(translations: { language: string; translatedValues: string[]; }[], i: number) {
        let commentText = '';
        for (const translation of translations) {
            if (translation.translatedValues.length > i) {
                if (commentText != '')
                    commentText += ',';
                commentText += `${translation.language}="${translation.translatedValues[i]}"`;
            }
        }
        if (commentText != '')
            commentText = `, Comment = '${commentText}'`;
        return commentText;
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

    getTextToWriteEnumObject(alEnum: alEnum): string {
        let tab: string = ''.padStart(4, ' ');
        let text: string = `enum ${alEnum.id} ${alEnum.name}\r\n`
        text += '{\r\n';
        if (alEnum.properties.length > 0) {
            for (let property of alEnum.properties)
                text += `${tab}${alPropertyName[property.name]} = ${property.value};\r\n`
            text += '\r\n'
        }
        for (let value of alEnum.values) {
            text += `${tab}value(${value.id}; ${value.name})\r\n`
            text += `${tab}{\r\n`
            for (let property of value.properties)
                text += `${tab}${tab}${alPropertyName[property.name]} = ${property.value};\r\n`
            text += `${tab}}\r\n`
        }
        text += `}\r\n`
        return text;
    }
}
interface alEnum {
    id: number
    name: string
    properties: alEnumProperty[]
    values: alEnumValue[]
}
interface alProperty {
    name: alPropertyName
    value: any
}
enum alPropertyName {
    Caption,
    Extensible
}
class alEnumProperty implements alProperty {
    name: alPropertyName;
    value: any
    private validProperties: alPropertyName[] = [
        alPropertyName.Caption,
        alPropertyName.Extensible
    ]
    constructor(name: alPropertyName, value: any) {
        if (!this.validProperties.includes(name))
            throw new Error('Invalid Property')
        this.name = name;
        this.value = value;
    }
}
interface alEnumValue {
    id: number,
    name: string,
    properties: alEnumValueProperty[]
}
class alEnumValueProperty implements alProperty {
    name: alPropertyName;
    value: any
    private validProperties: alPropertyName[] = [
        alPropertyName.Caption
    ]
    constructor(name: alPropertyName, value: any) {
        if (!this.validProperties.includes(name))
            throw new Error('Invalid Property')
        this.name = name;
        this.value = value;
    }
}