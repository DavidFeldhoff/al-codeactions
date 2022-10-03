import { CancellationToken, extensions, Location, Position, ReferenceContext, ReferenceProvider, TextDocument } from "vscode";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { ALObject } from "../Entities/alObject";
import { ALObjectParser } from "../Entity Parser/alObjectParser";
import { WorkspaceUtils } from "../Utils/workspaceUtils";

export class FindRelatedTriggersOfTableExt implements ReferenceProvider {
    private _search: BuiltInFunctions

    constructor(search: BuiltInFunctions){
        this._search = search;
    }
    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {
        let tableName: string | undefined = await ALObjectParser.getBaseObjectName(document, position)
        if (!tableName) return []
        let fieldName: string | undefined = await this.getFieldName(document, position)

        let locs: Location[] = await this.getTriggersOfTableExtensions(tableName, fieldName)

        let uniqueLocations: Location[] = []
        for (const location of locs) {
            if (!uniqueLocations.some(loc => loc.uri.fsPath == location.uri.fsPath && loc.range.isEqual(location.range)))
                uniqueLocations.push(location)
        }
        return uniqueLocations;
    }
    private async getFieldName(document: TextDocument, position: Position): Promise<string | undefined> {
        if (this._search != BuiltInFunctions.Validate)
            return
        return await ALObjectParser.findTableFieldAndReturnFieldName(document, position)
    }
    private async getTriggersOfTableExtensions(tableName: string, fieldName: string | undefined): Promise<Location[]> {
        let documents: TextDocument[] = await WorkspaceUtils.getTableExtensions(tableName);
        let validTriggers: string[] = [
            'on' + this._search.toLowerCase(),
            'onbefore' + this._search.toLowerCase(),
            'onafter' + this._search.toLowerCase()
        ]
        let tableExtensionTriggerLocations: Location[] = [];
        for (const document of documents) {
            tableExtensionTriggerLocations = tableExtensionTriggerLocations.concat(
                await new ALObject('dummyname', 'tableextension', 0, document.uri).getTriggers(validTriggers, fieldName)
            )
        }
        return tableExtensionTriggerLocations;
    }
}