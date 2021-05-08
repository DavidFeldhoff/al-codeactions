import { FSWatcher, readFileSync, watch, writeFileSync } from "fs";
import { join, resolve } from "path";
import { Extension, extensions, Terminal, window, workspace, WorkspaceConfiguration, WorkspaceFolder } from "vscode";
import { Err } from "../Utils/Err";

export class MyTerminal {
    private static myTerminal: MyTerminal | undefined;
    private terminal: Terminal;
    private static fsWatcher: FSWatcher | undefined;
    private constructor() {
        this.terminal = window.createTerminal('alcodeactions', 'powershell.exe');
        let { alLanguageExtension, alCodeActionsExtension } = this.getExtensions();

        this.terminal.sendText('Import-Module "' + join(alCodeActionsExtension.extensionPath, 'Powershell/ALCodeActions.psm1') + '"')
    }
    public static getInstance(): MyTerminal {
        if (!this.myTerminal)
            this.myTerminal = new MyTerminal();
        return this.myTerminal;
    }
    public compileProject(callback: (errorLogIssues: ErrorLog.Issue[]) => Promise<void>, cops: { codeCop?: boolean, pteCop?: boolean, appSourceCop?: boolean, uiCop?: boolean } = { codeCop: false, pteCop: false, appSourceCop: false, uiCop: false }, preScript: string[], suppressWarnings?: boolean, keepWarnings?: string[]): void {
        let workspaceFolder: WorkspaceFolder | undefined = this.getActiveWorkspaceFolder();
        if (!workspaceFolder) {
            window.showErrorMessage('No workspace folder opened')
            Err._throw('No workspace folder opened.')
        }

        let { alLanguageExtension, alCodeActionsExtension } = this.getExtensions();

        let errorLogFile: string = join(alCodeActionsExtension.extensionPath, 'Powershell', 'errorlog.txt');
        writeFileSync(errorLogFile, '');

        let settings: { assemblyProbingPathsArr: string[], useLegacyRuntime: boolean, packageCachePath: string } = this.getALSettings(workspaceFolder)
        let psCommand: string = this.createPSCommandCall(workspaceFolder, settings, errorLogFile, alLanguageExtension, alCodeActionsExtension, cops, keepWarnings);


        this.terminal.show(true);
        for (const preScriptLine of preScript)
            this.terminal.sendText(preScriptLine)
        this.terminal.sendText(psCommand)

        if (MyTerminal.fsWatcher)
            MyTerminal.fsWatcher.close();
        MyTerminal.fsWatcher = watch(errorLogFile, (event: string, filename: string) => {
            let errorLogContent: string = readFileSync(errorLogFile, { encoding: 'utf8' });
            if (errorLogContent.trim().length == 0)
                return
            if (errorLogContent.trim() != 'failed') {
                errorLogContent = errorLogContent.replace(/\r\n/g, ' ')
                let json: ErrorLog.Log = JSON.parse(errorLogContent)
                callback(json.issues)
            }
            if (MyTerminal.fsWatcher) {
                MyTerminal.fsWatcher.close();
            }
        })
    }
    public static createPSStatusLine(line1: string, line2: string) {
        return 'Write-Status "' + line1 + '" "' + line2 + '"'
    }
    private createPSCommandCall(workspaceFolder: WorkspaceFolder, settings: { assemblyProbingPathsArr: string[]; useLegacyRuntime: boolean; packageCachePath: string; }, errorLogFile: string, alLanguageExtension: Extension<any>, alCodeActionsExtension: Extension<any>, cops: { codeCop?: boolean | undefined; pteCop?: boolean | undefined; appSourceCop?: boolean | undefined; uiCop?: boolean | undefined; }, keepWarnings: string[] | undefined) {
        let psCommand: string = 'Start-Compilation';
        psCommand += ' -project "' + workspaceFolder.uri.fsPath + '"';
        psCommand += ' -packageCachePath "' + settings.packageCachePath + '"';
        psCommand += ' -pathToErrorLog "' + errorLogFile + '"';
        psCommand += ' -alLangVersion "' + alLanguageExtension.packageJSON.version + '"';
        psCommand += ' -alCodeActionsVersion "' + alCodeActionsExtension.packageJSON.version + '"';
        if (settings.useLegacyRuntime)
            psCommand += ' -useLegacyRuntime';
        if (cops.codeCop)
            psCommand += ' -codeCop';
        if (cops.pteCop)
            psCommand += ' -pteCop';
        if (cops.appSourceCop)
            psCommand += ' -appSourceCop';
        if (cops.uiCop)
            psCommand += ' -uiCop';
        if (settings.assemblyProbingPathsArr.length > 0)
            psCommand += ' -assemblyProbingPathsArr @("' + settings.assemblyProbingPathsArr.join('","') + '")';
        if (keepWarnings && keepWarnings.length > 0)
            psCommand += ' -keepWarnings @("' + keepWarnings.join('","') + '")';
        return psCommand;
    }

    private getActiveWorkspaceFolder() {
        let workspaceFolder: WorkspaceFolder | undefined;
        if (workspace.workspaceFolders) {
            if (workspace.workspaceFolders.length == 1)
                workspaceFolder = workspace.workspaceFolders[0];
            else if (window.activeTextEditor)
                workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
        }
        return workspaceFolder;
    }

    private getALSettings(workspaceFolder: WorkspaceFolder): { assemblyProbingPathsArr: string[], useLegacyRuntime: boolean, packageCachePath: string } {
        let alSettings: WorkspaceConfiguration = workspace.getConfiguration('al', workspaceFolder);
        let useLegacyRuntime: boolean = alSettings.get<boolean>('useLegacyRuntime', false);
        let packageCachePath: string = alSettings.get<string>('packageCachePath', './.alpackages');
        packageCachePath = resolve(workspaceFolder.uri.fsPath, packageCachePath);
        let assemblyProbingPathsArr: string[] = alSettings.get<string[]>('assemblyProbingPaths', []);
        for (let i = 0; i < assemblyProbingPathsArr.length; i++)
            assemblyProbingPathsArr[i] = resolve(workspaceFolder.uri.fsPath, assemblyProbingPathsArr[i])
        return { assemblyProbingPathsArr, useLegacyRuntime, packageCachePath };
    }

    private getExtensions(): { alLanguageExtension: Extension<any>, alCodeActionsExtension: Extension<any> } {
        let alLanguageExtension: Extension<any> | undefined = extensions.getExtension('ms-dynamics-smb.al')
        if (!alLanguageExtension) {
            Err._throw('Extension ms-dynamics-smb.al not found.')
        }
        let alCodeActionsExtension: Extension<any> | undefined = extensions.getExtension('davidfeldhoff.al-codeactions')
        if (!alCodeActionsExtension)
            Err._throw('Extension davidfeldhoff.al-codeactions not found.')
        return { alLanguageExtension, alCodeActionsExtension }
    }
}