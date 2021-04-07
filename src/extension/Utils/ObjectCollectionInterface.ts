import { TextDocument, Uri } from "vscode";

export interface ObjectCollectionInterface {
    isAvailable(): boolean;
    getTableExtensions(tableName: string): Promise<TextDocument[]>;
    getEventSubscriberDocuments(tableName: string, validEvents: string[]): Promise<{ uri: Uri, methodName: string }[]>;
}