import { TextDocument } from "vscode";

export interface ObjectCollectionInterface {
    isAvailable(): boolean;
    getTableExtensions(tableName: string): Promise<TextDocument[]>;
    getEventSubscriberDocuments(tableName: string): Promise<TextDocument[]>;
}