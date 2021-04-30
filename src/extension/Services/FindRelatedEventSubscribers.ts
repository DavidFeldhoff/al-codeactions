import { CancellationToken, Location, Position, ReferenceContext, ReferenceProvider, TextDocument } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { ALObject } from "../Entities/alObject";
import { ALObjectParser } from "../Entity Parser/alObjectParser";

export class FindRelatedEventSubscribers implements ReferenceProvider {
    private static _search: BuiltInFunctions
    private static active: boolean
    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {
        if (!FindRelatedEventSubscribers.active)
            return []
        FindRelatedEventSubscribers.deactivateListener()

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
    public static activateListener(search: BuiltInFunctions) {
        FindRelatedEventSubscribers._search = search
        FindRelatedEventSubscribers.active = true
    }
    public static deactivateListener() {
        FindRelatedEventSubscribers.active = false
    }
    private async getFieldName(document: TextDocument, position: Position): Promise<string | undefined> {
        if (FindRelatedEventSubscribers._search != BuiltInFunctions.Validate)
            return
        return await ALObjectParser.findTableFieldAndReturnFieldName(document, position)
    }
    private async checkEventSubscribers(tableName: string, fieldName?: string): Promise<Location[]> {
        let validEvents: string[] = [
            'onbefore' + FindRelatedEventSubscribers._search.toLowerCase() + 'event',
            'onafter' + FindRelatedEventSubscribers._search.toLowerCase() + 'event'
        ];
        return await new ALObject(tableName, 'table').getEventSubscribers(validEvents, fieldName)
    }
}