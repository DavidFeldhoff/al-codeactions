import { Uri, workspace } from "vscode";

export class Config {
    private static getConfig(uri?: Uri) {
        return workspace.getConfiguration('alCodeActions', uri);
    }
    static getFindNewProcedureLocation(uri?: Uri): FindNewProcedureLocation {
        return FindNewProcedureLocation[this.getConfig(uri).get('findNewProcedureLocation', "Sort by type, access modifier, range")]
    }
    static getVarParameters(uri?: Uri): string[] {
        return this.getConfig(uri).get('varParameters', ["IsHandled"]);
    }
    static getPublisherHasVarParametersOnly(uri?: Uri): boolean {
        return this.getConfig(uri).get('publisherHasVarParametersOnly', false);
    }
}

export enum FindNewProcedureLocation {
    "Sort by type, access modifier, name",
    "Sort by type, access modifier, range",
    "Always ask"
}