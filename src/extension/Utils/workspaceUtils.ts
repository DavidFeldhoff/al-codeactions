import { readFileSync } from 'fs';
import { parse } from 'jsonc-parser';
import * as vscode from 'vscode';

export class WorkspaceUtils {
    public static async findValidAppSourcePrefixes(uri: vscode.Uri): Promise<string[] | undefined> {
        let workspaceFolder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            let appsourcecopfile: vscode.Uri[] | undefined = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, 'AppSourceCop.json'));
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
}