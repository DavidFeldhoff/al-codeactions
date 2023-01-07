import { ICRSExtensionPublicApi } from "crs-al-language-extension-api";
import { join, parse } from "path";
import { CodeAction, CodeActionKind, commands, CompletionItem, CompletionItemKind, CompletionList, extensions, Position, Range, TextDocument, Uri, ViewColumn, window, workspace, WorkspaceEdit } from "vscode";
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import * as Telemetry from "../ApplicationInsights/applicationInsights";
import { ConvertOptionVariableToEnum } from "../ConvertOptionToEnum/ConvertOptionVariableToEnum";
import { ConvertTablefieldOptionToEnum } from "../ConvertOptionToEnum/ConvertTablefieldOptionToEnum";
import { IConvertOptionToEnumProvider } from "../ConvertOptionToEnum/IConvertOptionToEnumProvider";
import { ALCodeOutlineExtension } from "../devToolsExtensionContext";
import { ALEnum, ALEnumProperty, ALEnumValueProperty } from "../Entities/alEnum";
import { Command } from '../Entities/Command';
import { ALPropertyName } from "../Entities/properties";
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
        const convertTablefieldOptionToEnum = new ConvertTablefieldOptionToEnum(this.document, this.range);
        const convertOptionVariableToEnum = new ConvertOptionVariableToEnum(this.document, this.range);

        return convertTablefieldOptionToEnum.canConvertFastCheck() || convertOptionVariableToEnum.canConvertFastCheck()
    }
    async createCodeActions(): Promise<CodeAction[]> {
        let codeActions: CodeAction[] = []
        const convertTablefieldOptionToEnum = new ConvertTablefieldOptionToEnum(this.document, this.range);
        if (await convertTablefieldOptionToEnum.canConvert())
            codeActions = codeActions.concat(this.createCodeActionsForProvider(convertTablefieldOptionToEnum));

        const convertOptionVariableToEnum = new ConvertOptionVariableToEnum(this.document, this.range);
        if (await convertOptionVariableToEnum.canConvert())
            codeActions = codeActions.concat(this.createCodeActionsForProvider(convertOptionVariableToEnum));
        return codeActions;
    }
    private createCodeActionsForProvider(convertOptionToEnumProvider: IConvertOptionToEnumProvider): CodeAction[] {
        const codeActionsForProvider = []
        let codeAction: CodeAction = new CodeAction('Refactor to enum', CodeActionKind.RefactorRewrite);
        codeAction.command = {
            command: Command.refactorOptionToEnum,
            arguments: [this.document, this.range, convertOptionToEnumProvider, false],
            title: 'Refactor to enum'
        };
        codeActionsForProvider.push(codeAction);

        let extensibleCodeAction: CodeAction = new CodeAction('Refactor to extensible enum', CodeActionKind.RefactorRewrite);
        extensibleCodeAction.command = {
            command: Command.refactorOptionToEnum,
            arguments: [this.document, this.range, convertOptionToEnumProvider, true],
            title: 'Refactor to extensible enum'
        };
        codeActionsForProvider.push(extensibleCodeAction);
        return codeActionsForProvider;
    }

    async runCommand(convertProvider: IConvertOptionToEnumProvider, extensible: boolean) {
        let enumName: string | undefined = await window.showInputBox({ prompt: 'Please specify a name for the new enum' })
        if (!enumName)
            return
        if (enumName.includes(' ') && !(enumName.startsWith('"') && enumName.endsWith('"')))
            enumName = `"${enumName.replace(/"/g, '')}"`

        const identifierNameOrEmptyNodes: string[] | undefined = await convertProvider.getOptionValues();
        if (!identifierNameOrEmptyNodes)
            return
        const optionCaptionStrings: string[] = await convertProvider.getOptionCaptions();
        const translations: { language: string, translatedValues: string[] }[] = await convertProvider.getOptionCaptionTranslations();

        let baseFolder: string = parse(this.document.uri.fsPath).dir
        let alCodeOutlineApi = (await ALCodeOutlineExtension.getInstance()).getAPI()
        let enumId = await alCodeOutlineApi.toolsLangServerClient.getNextObjectId(baseFolder, "enum");
        convertProvider.appInsightsEntryProperties.enumIdReceivedFromAZALDevTools = enumId > 0

        const alEnum: ALEnum = this.createEnumObject(enumId, enumName, extensible, identifierNameOrEmptyNodes, optionCaptionStrings, translations);
        let textForEnumObject: string = this.getTextToWriteEnumObject(alEnum);
        let fileName = this.getEnumFilename(alEnum);

        let filePath = join(baseFolder, fileName);

        const edit: WorkspaceEdit = await convertProvider.createWorkspaceEdit(alEnum.name);
        const fileUri = Uri.file(filePath);
        edit.createFile(fileUri, undefined)
        edit.insert(fileUri, new Position(0, 0), textForEnumObject)
        await workspace.applyEdit(edit);

        let enumDocument: TextDocument = await workspace.openTextDocument(filePath);
        if (alEnum.id == 0)
            await this.tryToFixWrongId(enumDocument);
        await enumDocument.save();

        Telemetry.trackEvent(Telemetry.EventName.ConvertOptionToEnum, convertProvider.appInsightsEntryProperties)

        window.showTextDocument(enumDocument, ViewColumn.Beside);
    }
    private getEnumFilename(alEnum: ALEnum) {
        let crsApi: ICRSExtensionPublicApi = extensions.getExtension('waldo.crs-al-language-extension')?.exports;
        let fileName = crsApi.ObjectNamesApi.GetObjectFileName('enum', alEnum.id.toString(), alEnum.name);
        return fileName;
    }

    private createEnumObject(enumId: any, enumName: string, isExtensible: boolean, identifierNameOrEmptyNodes: string[], optionCaptionStrings: string[], translations: { language: string; translatedValues: string[]; }[]) {
        let alEnum: ALEnum = {
            id: enumId,
            name: enumName,
            properties: [new ALEnumProperty(ALPropertyName.Extensible, isExtensible)],
            values: []
        };
        for (let i = 0; i < identifierNameOrEmptyNodes.length; i++) {
            if (identifierNameOrEmptyNodes[i].length > 0) {
                let enumValueName = identifierNameOrEmptyNodes[i];
                let enumProperties: ALEnumValueProperty[] = [];
                if (optionCaptionStrings && optionCaptionStrings.length > i) {
                    let caption = optionCaptionStrings[i];
                    if (translations.length > 0)
                        caption += this.addCommentTranslationText(translations, i);
                    if (caption == `' '`)
                        caption += ', Locked = true';

                    enumProperties.push(new ALEnumValueProperty(ALPropertyName.Caption, caption));
                }

                alEnum.values.push({
                    id: i,
                    name: enumValueName,
                    properties: enumProperties
                });
            }
        }
        return alEnum;
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
            edit.replace(enumDocument.uri, currentIdRange, nextIDCompletionItem.label.toString())
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

    getTextToWriteEnumObject(alEnum: ALEnum): string {
        let tab: string = ''.padStart(4, ' ');
        let text: string = `enum ${alEnum.id} ${alEnum.name}\r\n`
        text += '{\r\n';
        if (alEnum.properties.length > 0) {
            for (let property of alEnum.properties)
                text += `${tab}${ALPropertyName[property.name]} = ${property.value};\r\n`
            text += '\r\n'
        }
        for (let value of alEnum.values) {
            text += `${tab}value(${value.id}; ${value.name})\r\n`
            text += `${tab}{\r\n`
            for (let property of value.properties)
                text += `${tab}${tab}${ALPropertyName[property.name]} = ${property.value};\r\n`
            text += `${tab}}\r\n`
        }
        text += `}\r\n`
        return text;
    }
}