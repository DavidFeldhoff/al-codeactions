import { readFileSync } from 'fs';
import { parse } from 'jsonc-parser';
import { RelativePattern, TextDocument, Uri, workspace, WorkspaceFolder } from 'vscode';
import { ObjectCollection_ALObjectDesigner } from '../ALObjectDesigner/ObjectCollection_ALObjectDesigner';
import { ObjectCollection_ALStudio } from '../ALStudio/ObjectCollection_ALStudio';
import { ObjectCollectionImpl } from '../ObjectCollection/ObjectCollectionImpl';
import { ObjectCollectionInterface } from '../ObjectCollection/ObjectCollectionInterface';

export class WorkspaceUtils {
    public static onAppJsonFound?: (json: any) => any
    public static async findAppJson(uri: Uri): Promise<any | undefined> {
        let workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            let appJsonFile: Uri[] | undefined = await workspace.findFiles(new RelativePattern(workspaceFolder, 'app.json'));
            if (appJsonFile && appJsonFile.length == 1) {
                let jsoncContent = readFileSync(appJsonFile[0].fsPath, { encoding: 'utf8' })
                let json: any = parse(jsoncContent);
                if (WorkspaceUtils.onAppJsonFound)
                    json = WorkspaceUtils.onAppJsonFound(json);
                return json;
            }
        }
        return
    }
    public static addNoImplicitWithToAppJson() {
        WorkspaceUtils.onAppJsonFound = (json) => {
            if (!json.features)
                json.features = []
            if (!json.features.includes('NoImplicitWith'))
                json.features.push('NoImplicitWith')
            return json
        }
    }
    public static async findValidAppSourcePrefixes(uri: Uri): Promise<string[] | undefined> {
        let workspaceFolder: WorkspaceFolder | undefined = workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            let appSourceCopFile: Uri[] | undefined = await workspace.findFiles(new RelativePattern(workspaceFolder, 'AppSourceCop.json'));
            if (appSourceCopFile && appSourceCopFile.length == 1) {
                let jsoncContent = readFileSync(appSourceCopFile[0].fsPath, { encoding: 'utf8' })
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
        let objectCollectionTools: ObjectCollectionInterface[] = [new ObjectCollection_ALStudio(), new ObjectCollection_ALObjectDesigner(), new ObjectCollectionImpl()];
        let tableExtensionDocuments: TextDocument[] = [];
        for (const objectCollectionTool of objectCollectionTools) {
            if (objectCollectionTool.isAvailable()) {
                tableExtensionDocuments = await objectCollectionTool.getTableExtensions(tableName);
                break;
            }
        }
        return tableExtensionDocuments;
    }
    static async getEventSubscribers(tableName: string, validEvents?: string[], fieldName?: string): Promise<{ uri: Uri, methodName: string }[]> {
        let objectCollectionTools: ObjectCollectionInterface[] = [new ObjectCollection_ALStudio(), new ObjectCollection_ALObjectDesigner(), new ObjectCollectionImpl()];
        let tableExtensionDocuments: { uri: Uri, methodName: string }[] = [];
        for (const objectCollectionTool of objectCollectionTools) {
            fieldName = fieldName ? fieldName : '';
            if (objectCollectionTool.isAvailable()) {
                tableExtensionDocuments = await objectCollectionTool.getEventSubscriberDocuments(tableName.removeQuotes(), validEvents, fieldName);
                break;
            }
        }
        return tableExtensionDocuments;
    }
}