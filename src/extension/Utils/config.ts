import { Uri, workspace } from "vscode";

export class Config {
    static getConfig(uri?: Uri) {
        return workspace.getConfiguration('alCodeActions', uri);
    }
    static getFindNewProcedureLocation(uri?: Uri): FindNewProcedureLocation {
        const enumValues = Object.keys(FindNewProcedureLocation).filter(k => isNaN(Number(k)));
        const settingValue: string | undefined = this.getConfig(uri).get('findNewProcedureLocation')
        if (settingValue && enumValues.includes(settingValue)) {
            return FindNewProcedureLocation[settingValue as keyof typeof FindNewProcedureLocation]
        }
        else
            return FindNewProcedureLocation["Sort by type, access modifier, range"]
    }
    static async setFindNewProcedureLocation(uri: Uri | undefined, newValue: string | undefined) {
        await this.getConfig(uri).update('findNewProcedureLocation', newValue);
    }
    static getVarParameters(uri?: Uri): string[] {
        return this.getConfig(uri).get('varParameters', ["IsHandled"]);
    }
    static getPublisherHasVarParametersOnly(uri?: Uri): boolean {
        return this.getConfig(uri).get('publisherHasVarParametersOnly', false);
    }
    static async setPublisherHasVarParametersOnly(uri: Uri | undefined, newValue: boolean | undefined) {
        await this.getConfig(uri).update('publisherHasVarParametersOnly', newValue);
    }
    static getInitializeIsHandledVariableWhenCreatingOnBeforePublisher(uri?: Uri): boolean {
        return this.getConfig(uri).get('initializeIsHandledVariableWhenCreatingOnBeforePublisher', false);
    }
    static async setInitializeIsHandledVariableWhenCreatingOnBeforePublisher(uri: Uri | undefined, newValue: boolean | undefined) {
        await this.getConfig(uri).update('initializeIsHandledVariableWhenCreatingOnBeforePublisher', newValue);
    }
    static getCommentsContainTranslations(uri?: Uri): boolean {
        return this.getConfig(uri).get('commentsContainTranslations', true);
    }
    static getExtractToLabelCreatesComment(uri?: Uri): boolean {
        return this.getConfig(uri).get('extractToLabelCreatesComment', false);
    }
    static async setExtractToLabelCreatesComment(uri: Uri | undefined, newValue: boolean | undefined) {
        await this.getConfig(uri).update('extractToLabelCreatesComment', newValue);
    }
}

export enum FindNewProcedureLocation {
    "Sort by type, access modifier, name",
    "Sort by type, access modifier, range"
}