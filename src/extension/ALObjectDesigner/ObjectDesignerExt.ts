import { TextDocument, Uri, workspace } from 'vscode';
import * as ALObjectDesigner from './api';
export class ObjectDesignerExt {
    static async getTableExtensions(tableName: string): Promise<TextDocument[]> {
        if (!ALObjectDesigner.ALObjectDesigner.isInstalled())
            return [];
        let api: ALObjectDesigner.ALObjectDesignerAPI = await ALObjectDesigner.ALObjectDesigner.getApi();
        if (!api.ALPanel.objectList)
            return [];

        let tableExtensions: Array<ALObjectDesigner.CollectorItem> = api.ALPanel.objectList.filter(object =>
            object.Type == 'TableExtension' &&
            object.TargetObjectType && object.TargetObjectType.toLowerCase() == 'table' &&
            object.TargetObject && object.TargetObject.toLowerCase() == tableName.toLowerCase()
        );
        let documents: TextDocument[] = [];
        for (let i = 0; i < tableExtensions.length; i++) {
            if (tableExtensions[i].FsPath == '') {
                try {
                    let objectRow: ALObjectDesigner.CollectorItem = tableExtensions[i];
                    let uri = Uri.parse(`alObjectDesignerDal://symbol/${objectRow.Type}${objectRow.Id > 0 ? ` ${objectRow.Id} ` : ''}${objectRow.Name.replace(/\//g, "_")} - ${objectRow.Application.replace(/[^\w]/g, "_")}.al#${JSON.stringify({ Type: objectRow.Type, Name: objectRow.Name })}`);
                    documents.push(await workspace.openTextDocument(uri));
                } catch {
                    continue;
                }
            }
            else
                documents.push(await workspace.openTextDocument(tableExtensions[i].FsPath));
        }
        return documents;
    }
}