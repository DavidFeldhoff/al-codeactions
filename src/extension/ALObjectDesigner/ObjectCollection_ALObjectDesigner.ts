import { Location, TextDocument, Uri, workspace } from 'vscode';
import { ALObjectDesigner, ALObjectDesignerAPI, CollectorItem } from './api';
import { ObjectCollectionInterface } from '../ObjectCollection/ObjectCollectionInterface';

export class ObjectCollection_ALObjectDesigner implements ObjectCollectionInterface {
    isAvailable(): boolean {
        return ALObjectDesigner.isInstalled();
    }

    async getTableExtensions(tableName: string): Promise<TextDocument[]> {
        let api: ALObjectDesignerAPI = await ALObjectDesigner.getApi();
        if (!api.ALPanel.objectList)
            return [];

        let tableExtensions: Array<CollectorItem> = api.ALPanel.objectList.filter(object =>
            object.Type == 'TableExtension' &&
            object.TargetObjectType && object.TargetObjectType.toLowerCase() == 'table' &&
            object.TargetObject && object.TargetObject.removeQuotes().toLowerCase() == tableName.removeQuotes().toLowerCase()
        );
        let documents: TextDocument[] = [];
        for (const tableExtension of tableExtensions) {
            if (tableExtension.FsPath == '') {
                try {
                    let objectRow: CollectorItem = tableExtension;
                    let uri = Uri.parse(`alObjectDesignerDal://symbol/${objectRow.Type}${objectRow.Id > 0 ? ` ${objectRow.Id} ` : ''}${objectRow.Name.replace(/\//g, "_")} - ${objectRow.Application.replace(/[^\w]/g, "_")}.al#${JSON.stringify({ Type: objectRow.Type, Name: objectRow.Name })}`);
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
        if (!this.isAvailable())
            return [];
        let api: ALObjectDesignerAPI = await ALObjectDesigner.getApi();

        let eventList: CollectorItem[] | undefined = api.ALPanel.eventList;
        if (!eventList) {
            await api.ALObjectCollector.discover()
            eventList = api.ALPanel.eventList;
            if (!eventList)
                return [];
        }

        let allEventSubscribersOfTable: CollectorItem[] = eventList.filter(object =>
            !object.EventPublisher &&
            object.EventType && object.EventType.toLowerCase() == 'eventsubscriber' &&
            object.TargetObjectType && object.TargetObjectType.toLowerCase() == 'table' &&
            object.TargetObject && object.TargetObject.trim().removeQuotes().toLowerCase() == tableName.removeQuotes().toLowerCase()
            && (!validEvents || object.TargetEventName && validEvents.includes(object.TargetEventName.trim().toLowerCase())) &&
            (!fieldName|| (object.TargetElementName && object.TargetElementName.trim().removeQuotes().toLowerCase() == fieldName.removeQuotes()))
        );
        let locations: { uri: Uri, methodName: string }[] = [];
        for (let i = 0; i < allEventSubscribersOfTable.length; i++) {
            let uri: Uri
            if (allEventSubscribersOfTable[i].FsPath == '') {
                try {
                    let objectRow: CollectorItem = allEventSubscribersOfTable[i];
                    uri = Uri.parse(`alObjectDesignerDal://symbol/${objectRow.Type}${objectRow.Id > 0 ? ` ${objectRow.Id} ` : ''}${objectRow.Name.replace(/\//g, "_")} - ${objectRow.Application.replace(/[^\w]/g, "_")}.al#${JSON.stringify({ Type: objectRow.Type, Name: objectRow.Name })}`);
                } catch {
                    continue;
                }
            } else
                uri = Uri.file(allEventSubscribersOfTable[i].FsPath)
            locations.push({ uri: uri, methodName: allEventSubscribersOfTable[i].EventName });
        }
        return locations;
    }
}