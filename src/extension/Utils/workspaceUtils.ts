import { readFileSync } from 'fs';
import { parse } from 'jsonc-parser';
import { RelativePattern, TextDocument, Uri, workspace, WorkspaceFolder } from 'vscode';
import { ObjectCollection_ALObjectDesigner } from '../ALObjectDesigner/ObjectCollection_ALObjectDesigner';
import { ObjectCollection_ALStudio } from '../ALStudio/ObjectCollection_ALStudio';
import { ObjectCollectionInterface } from './ObjectCollectionInterface';

export class WorkspaceUtils {
    public static async findValidAppSourcePrefixes(uri: Uri): Promise<string[] | undefined> {
        let workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            let appsourcecopfile: Uri[] | undefined = await workspace.findFiles(new RelativePattern(workspaceFolder, 'AppSourceCop.json'));
            if (appsourcecopfile && appsourcecopfile.length == 1) {
                let jsoncContent = readFileSync(appsourcecopfile[0].fsPath, { encoding: 'utf8' })
                let jsonObject = parse(jsoncContent);
                let validPrefixList: string[] = [];
                if (jsonObject.mandatoryPrefix)
                    validPrefixList.push(jsonObject.mandatoryPrefix);
                if (jsonObject.mandatoryAffixes) {
                    let affixes: string[] = jsonObject.mandatoryAffixes;
                    affixes.forEach(affix => { validPrefixList.push(affix); });
                }
                if (validPrefixList.length > 0)
                    return validPrefixList;
            }
        }
        return undefined;
    }
    static async getTableExtensions(tableName: string): Promise<TextDocument[]> {
        let objectCollectionTools: ObjectCollectionInterface[] = [new ObjectCollection_ALStudio(), new ObjectCollection_ALObjectDesigner()];
        let tableExtensionDocuments: TextDocument[] = [];
        for (const objectCollectionTool of objectCollectionTools) {
            if (objectCollectionTool.isAvailable()) {
                tableExtensionDocuments = await objectCollectionTool.getTableExtensions(tableName);
                break;
            }
        }
        return tableExtensionDocuments;
    }
    static async getEventSubscriberDocuments(tableName: string): Promise<TextDocument[]> {
        let objectCollectionTools: ObjectCollectionInterface[] = [new ObjectCollection_ALStudio(), new ObjectCollection_ALObjectDesigner()];
        let tableExtensionDocuments: TextDocument[] = [];
        for (const objectCollectionTool of objectCollectionTools) {
            if (objectCollectionTool.isAvailable()) {
                tableExtensionDocuments = await objectCollectionTool.getEventSubscriberDocuments(tableName);
                break;
            }
        }
        return tableExtensionDocuments;
    }
}