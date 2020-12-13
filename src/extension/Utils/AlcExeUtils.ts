import { existsSync } from "fs";
import { resolve } from "path";
import { WorkspaceFolder } from "vscode";

export class AlcExeUtils {
    public static buildAssemblyProbingPathsString(assemblyProbingPathsArr: string[], workspaceFolder: WorkspaceFolder) {
        for (let i = 0; i < assemblyProbingPathsArr.length; i++)
            assemblyProbingPathsArr[i] = resolve(workspaceFolder.uri.fsPath, assemblyProbingPathsArr[i]);
        let assemblyProbingPaths: string = '';
        for (const assemblyProbingPath of assemblyProbingPathsArr) {
            if (existsSync(assemblyProbingPath)) {
                if (assemblyProbingPaths != '')
                    assemblyProbingPaths += ',';
                assemblyProbingPaths += '\'' + assemblyProbingPath + '\'';
            }
        }
        return assemblyProbingPaths;
    }

    public static buildNoWarnString(keepWarnings: string[] | undefined) {
        let codeCopWarnings: string[] = [
            'AA0001', 'AA0002', 'AA0003', 'AA0005', 'AA0008', 'AA0013', 'AA0018', 'AA0021', 'AA0022', 'AA0040', 'AA0072', 'AA0073', 'AA0074', 'AA0087', 'AA0100', 'AA0101', 'AA0102', 'AA0103', 'AA0104', 'AA0105', 'AA0106', 'AA0131', 'AA0136', 'AA0137', 'AA0139', 'AA0150', 'AA0161', 'AA0175', 'AA0181', 'AA0189', 'AA0194', 'AA0198', 'AA0199', 'AA0200', 'AA0201', 'AA0202', 'AA0203', 'AA0204', 'AA0205', 'AA0206', 'AA0207', 'AA0210', 'AA0211', 'AA0213', 'AA0214', 'AA0215', 'AA0216', 'AA0217', 'AA0218', 'AA0219', 'AA0220', 'AA0221', 'AA0222', 'AA0223', 'AA0224', 'AA0225', 'AA0226', 'AA0227', 'AA0228', 'AA0230', 'AA0231', 'AA0232', 'AA0233', 'AA0235', 'AA0237', 'AA0240', 'AA0241', 'AA0448', 'AA0462', 'AA0470'
        ];
        let alWarnings: string[] = [
            'AL0254', 'AL0269', 'AL0432', 'AL0468', 'AL0482', 'AL0509', 'AL0547', 'AL0561', 'AL0569', 'AL0589', 'AL0603', 'AL0604', 'AL0606', 'AL0667', 'AL0601'
        ];
        let warningsArr: string[] = alWarnings.concat(codeCopWarnings);
        if (keepWarnings)
            for (const warningToKeep of keepWarnings) {
                let index: number = warningsArr.findIndex(warning => warning == warningToKeep);
                if (index > 0)
                    warningsArr.splice(index, 1);
            }
        for (let i = 0; i < warningsArr.length; i++)
            warningsArr[i] = '\'' + warningsArr[i] + '\'';
        let warnings: string = warningsArr.join(',');
        return warnings;
    }
    public static getPathToAlcExe(useLegacyRuntime: boolean) {
        let pathToAlcExe: string;
        if (useLegacyRuntime)
            pathToAlcExe = '.\\alc.exe';

        else
            pathToAlcExe = '.\\win32\\alc.exe';
        return pathToAlcExe;
    }

    public static createCompileCommand(pathToAlcExe: string, workspaceFolder: WorkspaceFolder, packageCachePath: string, assemblyProbingPaths: string, cops: { codeCop?: boolean | undefined; pteCop?: boolean | undefined; appSourceCop?: boolean | undefined; uiCop?: boolean | undefined; }, copPaths: { codeCop: string, pteCop: string, appSourceCop: string, uiCop: string }, suppressWarnings: boolean | undefined, warnings: string, errorLogTempFile: string) {
        let compileCommandString: string = pathToAlcExe + ' /project:\'' + workspaceFolder.uri.fsPath + '\' /packagecachepath:\'' + packageCachePath + '\'';
        if (assemblyProbingPaths != '')
            compileCommandString += ' /assemblyprobingpaths:' + assemblyProbingPaths;
        if (cops.codeCop)
            compileCommandString += ' /analyzer:\'' + copPaths.codeCop + '\'';
        if (cops.appSourceCop)
            compileCommandString += ' /analyzer:\'' + copPaths.appSourceCop + '\'';
        if (cops.uiCop)
            compileCommandString += ' /analyzer:\'' + copPaths.uiCop + '\'';
        if (cops.pteCop)
            compileCommandString += ' /analyzer:\'' + copPaths.pteCop + '\'';
        compileCommandString += ' /generatereportlayout-';
        if (suppressWarnings)
            compileCommandString += ' /nowarn:' + warnings;
        compileCommandString += ' /errorlog:\'' + errorLogTempFile + '\'';
        return compileCommandString;
    }
}