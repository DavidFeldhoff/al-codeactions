import { commands, TextDocument, Uri, workspace } from 'vscode';
import { ObjectCollectionInterface } from '../ObjectCollection/ObjectCollectionInterface';
import { ALStudioExtension } from './ALStudioExtension';
import { alstudio } from './api';


export class ObjectCollection_ALStudio implements ObjectCollectionInterface {
    isAvailable(): boolean {
        return ALStudioExtension.isAvailable();
    }

    async getTableExtensions(tableName: string): Promise<TextDocument[]> {
        let api: alstudio.IExternalAPIService | undefined = await ALStudioExtension.getAlStudioAPI();
        if (!api)
            return [];

        if (!api.isWorkspaceScanned)
            await commands.executeCommand('alStudio.discover');

        let objects: alstudio.CollectorItemExternal[] = api.getObjects();
        let tableExtensions: alstudio.CollectorItemExternal[] = objects.filter(object =>
            object.Type == 'tableextension' &&
            object.TargetObject.removeQuotes().toLowerCase() == tableName.removeQuotes().toLowerCase()
        );
        let documents: TextDocument[] = [];
        for (const tableExtension of tableExtensions) {
            if (tableExtension.FsPath == '') {
                try {
                    let uri = api.getSymbolUri(alstudio.ALObjectType.tableextension, tableExtension.Name);
                    documents.push(await workspace.openTextDocument(uri));
                } catch {
                    continue;
                }
            }
            else
                documents.push(await workspace.openTextDocument(tableExtension.FsPath));
        }
        return documents;
    }

    async getEventSubscriberDocuments(tableName: string, validEvents?: string[], fieldName?: string): Promise<{ uri: Uri, methodName: string }[]> {
        let api: alstudio.IExternalAPIService | undefined = await ALStudioExtension.getAlStudioAPI();
        if (!api)
            return [];

        if (!api.isWorkspaceScanned)
            await commands.executeCommand('alStudio.discover');

        let objects: alstudio.CollectorItemExternal[] = api.getObjects();
        if (validEvents)
            validEvents.forEach(event => event.toLowerCase())
        

        let eventSubscribersOfTable: alstudio.CollectorItemExternal[] = objects.filter(object =>
            object.ItemTypeCaption.toLowerCase() == 'eventsubscriber' &&
            object.TargetObjectType == 'table' &&
            object.TargetObject && object.TargetObject.trim().removeQuotes().toLowerCase() == tableName.removeQuotes().toLowerCase() &&
            (!validEvents || object.EventName && validEvents.includes(object.EventName.trim().toLowerCase())) &&
            (!fieldName || object.EventFieldName && object.EventFieldName.trim().removeQuotes().toLowerCase() == fieldName.removeQuotes().toLowerCase())
        );

        let locations: { uri: Uri, methodName: string }[] = [];
        for (const eventSubscriberOfTable of eventSubscribersOfTable) {
            let uri: Uri
            if (eventSubscriberOfTable.FsPath == '') {
                try {
                    uri = api.getSymbolUri(eventSubscriberOfTable.TypeId, eventSubscriberOfTable.Name);
                } catch {
                    continue;
                }
            } else
                uri = Uri.file(eventSubscriberOfTable.FsPath)
            locations.push({ uri: uri, methodName: eventSubscriberOfTable.EventSubscriberName })
        }
        return locations;
    }
}