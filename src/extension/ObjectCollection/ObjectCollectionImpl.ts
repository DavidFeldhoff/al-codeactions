import { RelativePattern, TextDocument, Uri, workspace } from "vscode";
import { Document } from "../Entities/document";
import { ObjectCollectionInterface } from "./ObjectCollectionInterface";

export class ObjectCollectionImpl implements ObjectCollectionInterface {
    isAvailable(): boolean {
        return true;
    }
    async getTableExtensions(tableName: string): Promise<TextDocument[]> {
        let alUris: Uri[] = await this.getUniqueUrisOfWorkspace();
        let documents: TextDocument[] = []
        for (let i = 0; i < alUris.length; i++) {
            let doc = await Document.load(alUris[i])
            let tableRegEx = /tableextension \d+ ("[^"]+"|\w+) extends ("[^"]+"|\w+)/
            let regexGlobalMatch: RegExpMatchArray | null = doc.fileContent.match(new RegExp(tableRegEx, 'ig'));
            if (regexGlobalMatch) {
                for (let matchedString of regexGlobalMatch) {
                    let match: RegExpExecArray | null = new RegExp(tableRegEx, 'i').exec(matchedString);
                    if (match && match.length > 0) {
                        let extendsTable = match[2].toLowerCase().removeQuotes()
                        if (extendsTable == tableName.toLowerCase().removeQuotes()) {
                            documents.push(await workspace.openTextDocument(alUris[i]))
                        }
                    }
                }
            }
        }
        return documents
    }

    async getEventSubscriberDocuments(tableName: string, validEvents?: string[], fieldName?: string): Promise<{ uri: Uri; methodName: string; }[]> {
        let alUris: Uri[] = await this.getUniqueUrisOfWorkspace();
        let returnArr: { uri: Uri; methodName: string; }[] = []
        for (let i = 0; i < alUris.length; i++) {
            let doc = await Document.load(alUris[i]);
            let tableRegEx = /\[EventSubscriber\(ObjectType::Table,\s*Database::("[^"]+"|\w+),\s*'([^']+)',\s*'([^']*)',\s*(?:true|false),\s*(?:true|false)\)\]\s*\r\n\s*(?:local )?procedure ("[^"]+"|\w+)/
            let regexGlobalMatch: RegExpMatchArray | null = doc.fileContent.match(new RegExp(tableRegEx, 'ig'))
            if (regexGlobalMatch) {
                for (let matchedString of regexGlobalMatch) {
                    let match: RegExpExecArray | null = new RegExp(tableRegEx, 'i').exec(matchedString);
                    if (match && match.length > 0) {
                        let subscribedToTableName = match[1].removeQuotes().toLowerCase()
                        let eventName = match[2].toLowerCase()
                        let subEventName = match[3].removeQuotes().toLowerCase()
                        let methodName = match[4].removeQuotes()
                        if (subscribedToTableName == tableName.removeQuotes().toLowerCase() &&
                            (!validEvents || validEvents.includes(eventName)) &&
                            (!fieldName || subEventName == fieldName.removeQuotes().toLowerCase())) {
                            returnArr.push({ uri: alUris[i], methodName: methodName })
                        }
                    }
                }
            }
        }
        return returnArr;
    }

    private async getUniqueUrisOfWorkspace(): Promise<Uri[]> {
        let workspaces: string[] = workspace.workspaceFolders?.map((workspaceFolder) => workspaceFolder.uri.fsPath)!;
        let alUris: Uri[] = [];
        let alFilePaths: string[] = [];
        for (let i = 0; i < workspaces.length; i++) {
            let alFileUrisOfWorkspaceFolder: Uri[] = await workspace.findFiles(new RelativePattern(workspaces[i], '**/*.al'));
            for (const alFileUri of alFileUrisOfWorkspaceFolder)
                if (!alFilePaths.includes(alFileUri.path)) {
                    alFilePaths.push(alFileUri.path);
                    alUris.push(alFileUri);
                }
        }
        return alUris;
    }

}