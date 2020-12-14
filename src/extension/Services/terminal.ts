import { existsSync, FSWatcher, readdirSync, readFileSync, unlinkSync, watch, writeFileSync } from "fs";
import { join, resolve } from "path";
import { Extension, extensions, ProgressLocation, Terminal, window, workspace, WorkspaceConfiguration, WorkspaceFolder } from "vscode";
import { AlcExeUtils } from "../Utils/AlcExeUtils";

export class MyTerminal {
    private static myTerminal: MyTerminal | undefined;
    private terminal: Terminal;
    private static fsWatcher: FSWatcher | undefined;
    private compiled: boolean;
    private constructor() {
        this.terminal = window.createTerminal('alcodeactions');
        this.compiled = false
    }
    public static getInstance(): MyTerminal {
        if (!this.myTerminal)
            this.myTerminal = new MyTerminal();
        return this.myTerminal;
    }
    private async showProgressBar(): Promise<void> {
        await window.withProgress({
            location: ProgressLocation.Notification,
            title: "I am long running!",
            cancellable: false
        }, (progress, token) => {
            do {
                setTimeout(() => { }, 100)
            } while (!this.compiled)
            return new Promise(resolve => { })
        })
    }
    public compileProject(callback: (errorLogIssues: ErrorLog.Issue[]) => Promise<void>, cops: { codeCop?: boolean, pteCop?: boolean, appSourceCop?: boolean, uiCop?: boolean } = { codeCop: false, pteCop: false, appSourceCop: false, uiCop: false }, preScript: string[], suppressWarnings?: boolean, keepWarnings?: string[]): void {
        // this.showProgressBar();
        let workspaceFolder: WorkspaceFolder | undefined
        if (workspace.workspaceFolders) {
            if (workspace.workspaceFolders.length == 1)
                workspaceFolder = workspace.workspaceFolders[0]
            else if (window.activeTextEditor)
                workspaceFolder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri)
        }
        if (!workspaceFolder)
            throw new Error('No workspace folder opened.')

        let scriptCreationResult: { psScriptPath: string; errorLogFile: string; } | undefined = this.createPowershellScript(workspaceFolder, cops, suppressWarnings, keepWarnings, preScript);
        if (!scriptCreationResult)
            return;
        let psScriptPath = scriptCreationResult.psScriptPath
        let errorLogFile = scriptCreationResult.errorLogFile

        this.terminal.show(true);
        this.terminal.sendText(psScriptPath)

        if (MyTerminal.fsWatcher)
            MyTerminal.fsWatcher.close();
        MyTerminal.fsWatcher = watch(errorLogFile, (event: string, filename: string) => {
            let errorLogContent: string = readFileSync(errorLogFile, { encoding: 'utf8' });
            if (errorLogContent.trim().length == 0)
                return
            this.compiled = true
            let json: ErrorLog.Log = JSON.parse(errorLogContent)
            callback(json.issues)
            if (MyTerminal.fsWatcher) {
                MyTerminal.fsWatcher.close();
            }
            // unlinkSync(psScriptPath)
            // unlinkSync(errorLogFile);
            // unlinkSync(errorLogTempFile);
        })
    }
    private createPowershellScript(workspaceFolder: WorkspaceFolder, cops: { codeCop?: boolean | undefined; pteCop?: boolean | undefined; appSourceCop?: boolean | undefined; uiCop?: boolean | undefined; }, suppressWarnings: boolean | undefined, keepWarnings: string[] | undefined, preScript: string[]): { psScriptPath: string; errorLogFile: string; } | undefined {

        let folders: { pathToMyExtFolder: string; pathToALLangExtFolder: string; } | undefined = this.getPathsToExtensionFolders();
        if (!folders)
            throw new Error('Extension folders not found. Command aborted.')

        let pathToALLangExtBinFolder: string = join(folders.pathToALLangExtFolder, 'bin');
        let psScriptPath: string = join(folders.pathToMyExtFolder, 'Compile-Solution.ps1');
        let errorLogFile: string = join(folders.pathToMyExtFolder, 'errorlog.txt');
        let errorLogTempFile: string = join(folders.pathToMyExtFolder, 'errorlogtemp.txt');

        let copPaths: { codeCop: string; pteCop: string; appSourceCop: string; uiCop: string; } = this.getCopPaths();

        let { assemblyProbingPathsArr, useLegacyRuntime, packageCachePath }: { assemblyProbingPathsArr: string[]; useLegacyRuntime: boolean; packageCachePath: string; } = this.getALSettings(workspaceFolder);
        let assemblyProbingPaths: string = AlcExeUtils.buildAssemblyProbingPathsString(assemblyProbingPathsArr, workspaceFolder);
        let warnings: string = AlcExeUtils.buildNoWarnString(keepWarnings);
        let pathToAlcExe: string = AlcExeUtils.getPathToAlcExe(useLegacyRuntime);

        let compileCommandString: string = AlcExeUtils.createCompileCommand(pathToAlcExe, workspaceFolder, packageCachePath, assemblyProbingPaths, cops, copPaths, suppressWarnings, warnings, errorLogTempFile);

        let psScript: string[] = this.createPowershellScriptContent(preScript, pathToALLangExtBinFolder, compileCommandString, errorLogTempFile, errorLogFile);
        writeFileSync(psScriptPath, psScript.join('\r\n'), { encoding: 'utf8' });
        writeFileSync(errorLogFile, '');
        return { psScriptPath, errorLogFile };
    }

    private createPowershellScriptContent(preScript: string[], pathToALLangExtBinFolder: string, compileCommandString: string, errorLogTempFile: string, errorLogFile: string) {
        let psScript: string[] = [];
        psScript = psScript.concat(preScript);
        psScript = psScript.concat([
            '$currLocation = Get-Location',
            'Write-Host "Compile solution to get compiler warnings (may take some time)" -ForegroundColor Green',
            'Set-Location \"' + pathToALLangExtBinFolder + '\"',
            '$buildOutput = ' + compileCommandString + ' 2>&1',
            '',
            '$json = Get-Content \"' + errorLogTempFile + '\" | ConvertFrom-Json',
            '$errorIssues = $json.issues | Where-Object { $_.properties.severity -eq "error" }',
            '$errorExists = $errorIssues -ne $null',
            'if($errorExists) {',
            '    Write-Host "Compilation failed. Command stopped. Now printing build output for you to figure out what went wrong.." -ForegroundColor Red',
            '    $buildOutput',
            '} else {',
            '    Write-Host "Compilation was successful and warnings were extracted. Now executing the function.." -ForegroundColor Green',
            '    Set-Content -Path "' + errorLogFile + '" -Value (Get-Content -Path \'' + errorLogTempFile + '\')',
            '}',
            'Set-Location $currLocation'
        ]);
        return psScript;
    }

    private getCopPaths() {
        let codeCop: string = '.\\Analyzers/Microsoft.Dynamics.Nav.CodeCop.dll';
        let pteCop: string = '.\\Analyzers/Microsoft.Dynamics.Nav.PerTenantExtensionCop.dll';
        let appSourceCop: string = '.\\Analyzers/Microsoft.Dynamics.Nav.AppSourceCop.dll';
        let uiCop: string = '.\\Analyzers/Microsoft.Dynamics.Nav.UICop.dll';
        return { codeCop, pteCop, appSourceCop, uiCop };
    }

    private getALSettings(workspaceFolder: WorkspaceFolder) {
        let alSettings: WorkspaceConfiguration = workspace.getConfiguration('al', workspaceFolder);
        let useLegacyRuntime: boolean = alSettings.get<boolean>('useLegacyRuntime', false);
        let packageCachePath: string = alSettings.get<string>('packageCachePath', './.alpackages');
        packageCachePath = resolve(workspaceFolder.uri.fsPath, packageCachePath);
        let assemblyProbingPathsArr: string[] = alSettings.get<string[]>('assemblyProbingPaths', []);
        return { assemblyProbingPathsArr, useLegacyRuntime, packageCachePath };
    }

    private getPathsToExtensionFolders() {

        let userProfile: string | undefined = process.env.USERPROFILE
        if (!userProfile)
            return
        let pathToExtensions: string = join(userProfile, '.vscode/extensions')

        let extFolders: string[] = readdirSync(pathToExtensions, { encoding: 'utf8' })
        let myExtFolderName: string | undefined = extFolders.find(entry => entry.startsWith('davidfeldhoff.al-codeactions'))
        if (!myExtFolderName)
            return

        let alExtension: Extension<any> | undefined = extensions.getExtension('ms-dynamics-smb.al')
        if (!alExtension)
            throw new Error('Extension ms-dynamics-smb.al not found.')
        let alFolderName: string = 'ms-dynamics-smb.al-' + alExtension.packageJSON.version
        let alLangExtFolderName: string | undefined = extFolders.find(entry => entry == alFolderName)
        if (!alLangExtFolderName)
            return

        let pathToMyExtFolder: string = join(pathToExtensions, myExtFolderName);
        let pathToALLangExtFolder: string = join(pathToExtensions, alLangExtFolderName);
        return { pathToMyExtFolder, pathToALLangExtFolder };
    }

    public sendText(lineText: string) {
        this.terminal.sendText(lineText)
    }
}