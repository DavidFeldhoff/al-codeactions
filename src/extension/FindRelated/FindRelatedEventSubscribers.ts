import { CancellationToken, Location, Position, ReferenceContext, ReferenceProvider, TextDocument } from "vscode";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { ALObject } from "../Entities/alObject";
import { ALObjectParser } from "../Entity Parser/alObjectParser";

export class FindRelatedEventSubscribers implements ReferenceProvider {
    private _search: BuiltInFunctions
    constructor(search: BuiltInFunctions) {
        this._search = search
    }
    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {

        let tableName: string | undefined = await ALObjectParser.getBaseObjectName(document, position)
        if (!tableName) return []
        let fieldName: string | undefined = await this.getFieldName(document, position)

        let locs: Location[] = await this.checkEventSubscribers(tableName, fieldName)

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
    private async checkEventSubscribers(tableName: string, fieldName?: string): Promise<Location[]> {
        let validEvents: string[] = [
            'onbefore' + this._search.toLowerCase() + 'event',
            'onafter' + this._search.toLowerCase() + 'event'
        ];
        return await new ALObject(tableName, 'table').getEventSubscribers(validEvents, fieldName)
    }
}