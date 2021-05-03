import { Uri, workspace } from "vscode";

export class Config {
    private static getConfig(uri?: Uri) {
        return workspace.getConfiguration('alCodeActions', uri);
    }
    static getFindNewProcedureLocation(uri?: Uri): FindNewProcedureLocation {
        return FindNewProcedureLocation[this.getConfig(uri).get('findNewProcedureLocation', "Sort by type, access modifier, name")]
    }
}

export enum FindNewProcedureLocation {
    "Sort by type, access modifier, name",
    "Sort by type, access modifier, range",
    "Always ask"
}