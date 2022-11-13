import { WorkspaceEdit } from "vscode"

export interface IConvertOptionToEnumProvider {
    appInsightsEntryProperties: any
    canConvertFastCheck(): boolean
    canConvert(): Promise<boolean>
    getOptionValues(): Promise<string[] | undefined>
    getOptionCaptions(): Promise<string[]>
    getOptionCaptionTranslations(): Promise<{ language: string, translatedValues: string[] }[]>
    createWorkspaceEdit(enumName: string): Promise<WorkspaceEdit>
}