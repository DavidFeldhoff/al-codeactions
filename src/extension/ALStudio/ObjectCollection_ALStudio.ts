import { TextDocument, Uri, workspace } from 'vscode';
import { ObjectCollectionInterface } from '../Utils/ObjectCollectionInterface';
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

        let objects: alstudio.CollectorItemExternal[] = api.getObjects();
        let tableExtensions: alstudio.CollectorItemExternal[] = objects.filter(object =>
            object.Type == 'tableextension' &&
            object.TargetObject.toLowerCase() == tableName.toLowerCase()
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

    async getEventSubscriberDocuments(tableName: string): Promise<TextDocument[]> {
        let api: alstudio.IExternalAPIService | undefined = await ALStudioExtension.getAlStudioAPI();
        if (!api)
            return [];
        let objects: alstudio.CollectorItemExternal[] = api.getObjects();
        let uri: Uri | null = api.getSymbolUri(alstudio.ALObjectType.table, tableName);
        let eventSubscribersOfTable: alstudio.CollectorItemExternal[] = objects.filter(object =>
            object.ItemTypeCaption.toLowerCase() == 'eventsubscriber' &&
            object.TargetObjectType == 'table' &&
            object.TargetObject && object.TargetObject.trim().replace(/^"?([^"]+)"?$/, '$1').toLowerCase() == tableName.toLowerCase()
        );

        let documents: TextDocument[] = [];
        for (const eventSubscriberOfTable of eventSubscribersOfTable) {
            if (eventSubscriberOfTable.FsPath == '') {
                try {
                    let uri = api.getSymbolUri(eventSubscriberOfTable.TypeId, eventSubscriberOfTable.Name);
                    documents.push(await workspace.openTextDocument(uri));
                } catch {
                    continue;
                }
            } else
                documents.push(await workspace.openTextDocument(eventSubscriberOfTable.FsPath));
        }
        return documents;
    }
}