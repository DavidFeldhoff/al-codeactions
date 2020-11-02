import * as vscode from 'vscode';
import * as fs from 'fs';
import { WithDocumentAL0606Fixer } from '../FixWithUsage/WithDocumentAL0606Fixer';
import { WithDocumentFixer } from '../FixWithUsage/WithDocumentFixer';
import { WithDocumentAL0604Fixer } from '../FixWithUsage/WithDocumentAL0604Fixer';

export class CommandFixWithUsage {
    public static async fixWithUsages() {
        let alExtension: vscode.Extension<any> | undefined = vscode.extensions.getExtension('ms-dynamics-smb.al');
        let supported: boolean = false;
        if (alExtension) {
            let alExtensionVersion: string = alExtension.packageJSON.version;
            let major: number = +alExtensionVersion.split('.')[0];
            let minor: number = +alExtensionVersion.split('.')[1];
            let patch: number = +alExtensionVersion.split('.')[2];
            supported = major > 6 || (major === 6 && (minor > 0 || (minor === 0 && patch >= 291706)));
        }
        if (!supported) {
            vscode.window.showErrorMessage('You have to have at least version 6.0.297106 of the AL Language extension installed to use this command.');
            return;
        }
        let settingsToDeactivate: string = CommandFixWithUsage.getSettingsToDeactivate();
        if (settingsToDeactivate !== '') {
            vscode.window.showWarningMessage('Please deactivate the following settings as they may break the batch run: ' + settingsToDeactivate);
            return;
        }
        let answer: string | undefined = await vscode.window.showWarningMessage('Please make sure that your git working directory is clean, so that you can double-check the changes being made more easily. Do you want to go ahead?', 'Only Implicit', 'Only Explicit', 'All', 'Abort');
        if (answer && answer !== 'Abort') {
            let AL0604WarningsAtStart: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tuple => tuple[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0604'));
            let AL0606WarningsAtStart: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tuple => tuple[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0606'));
            AL0604WarningsAtStart.forEach(tuple => tuple[1] = tuple[1].filter(diag => diag.code === 'AL0604'));
            AL0606WarningsAtStart.forEach(tuple => tuple[1] = tuple[1].filter(diag => diag.code === 'AL0606'));

            if (['Only Implicit', 'All'].includes(answer)) {
                await this.fixImplicitWithUsages();
            }
            if (['Only Explicit', 'All'].includes(answer)) {
                await this.fixExplicitWithUsages();
            }

            CommandFixWithUsage.createFinishMessage(AL0604WarningsAtStart, AL0606WarningsAtStart);
        }
    }

    private static getSettingsToDeactivate() {
        let settingsToDeactivate: string = '';
        let crsSettings = vscode.workspace.getConfiguration('CRS');
        let alOutlineSettings = vscode.workspace.getConfiguration('alOutline');
        let crsOnSaveAlFileAction: string | undefined = crsSettings.get<string>('OnSaveAlFileAction');
        let alOutlineCodeActionsOnSave: string[] | undefined = alOutlineSettings.get<string[]>('codeActionsOnSave');
        let alOutlineFixCodeCopMissingParenthesesOnSave: boolean | undefined = alOutlineSettings.get<boolean>('fixCodeCopMissingParenthesesOnSave');

        if (crsOnSaveAlFileAction && ["rename", "reorganize"].includes(crsOnSaveAlFileAction.toLowerCase())) {
            settingsToDeactivate += 'CRS.OnSaveAlFileAction';
        }
        if (alOutlineCodeActionsOnSave && alOutlineCodeActionsOnSave.length > 0) {
            if (settingsToDeactivate !== '') { settingsToDeactivate += ', '; }
            settingsToDeactivate += 'alOutline.codeActionsOnSave';
        }
        if (alOutlineFixCodeCopMissingParenthesesOnSave) {
            if (settingsToDeactivate !== '') { settingsToDeactivate += ', '; }
            settingsToDeactivate += 'alOutline.fixCodeCopMissingParenthesesOnSave';
        }
        return settingsToDeactivate;
    }

    private static createFinishMessage(allDocumentsWithDiagnosticOfAL0604: [vscode.Uri, vscode.Diagnostic[]][], allDocumentsWithDiagnosticOfAL0606: [vscode.Uri, vscode.Diagnostic[]][]) {
        let finishMsg: string = "Finished!";
        // if (allDocumentsWithDiagnosticOfAL0604.length > 0) {
        //     let diagnosticsFixed: number = 0;
        // allDocumentsWithDiagnosticOfAL0604.forEach(tuple => diagnosticsFixed += tuple[1].length);
        //     finishMsg += " Implicit with fixed: " + diagnosticsFixed + " in " + allDocumentsWithDiagnosticOfAL0604.length + " files.";
        // }
        // if (allDocumentsWithDiagnosticOfAL0606.length > 0) {
        //     let diagnosticsFixed: number = 0;
        // allDocumentsWithDiagnosticOfAL0606.forEach(tuple => diagnosticsFixed += tuple[1].length);
        //     finishMsg += " Explicit with fixed: " + diagnosticsFixed + " in " + allDocumentsWithDiagnosticOfAL0606.length + " files.";
        // }
        if (allDocumentsWithDiagnosticOfAL0606.length > 0 || allDocumentsWithDiagnosticOfAL0604.length > 0) {
            vscode.window.showInformationMessage(finishMsg);
        }
    }

    static async fixImplicitWithUsages() {
        let allDocumentsWithDiagnosticOfAL0604: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tuple => tuple[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0604'));
        allDocumentsWithDiagnosticOfAL0604.forEach(tuple => tuple[1] = tuple[1].filter(diag => diag.code === 'AL0604'));
        if (allDocumentsWithDiagnosticOfAL0604.length === 0) {
            vscode.window.showInformationMessage('No warnings of type AL0604 found.');
            return;
        }
        allDocumentsWithDiagnosticOfAL0604 = allDocumentsWithDiagnosticOfAL0604.sort((a, b) => b[1].length - a[1].length);
        let withDocumentAL0604Fixer: WithDocumentAL0604Fixer = new WithDocumentAL0604Fixer();
        CommandFixWithUsage.addDocumentsToFix(allDocumentsWithDiagnosticOfAL0604, withDocumentAL0604Fixer);
        await withDocumentAL0604Fixer.fixWithUsagesOfAllDocuments();
        let message: string = 'Fixed ' + withDocumentAL0604Fixer.getNoOfUsagesFixed() + ' implicit with usages in ' + withDocumentAL0604Fixer.getNoOfDocsFixed() + ' files.';
        vscode.window.showInformationMessage(message);
        if (withDocumentAL0604Fixer.moreThan100Warnings) {
            let answer: string | undefined = await vscode.window.showInformationMessage('Please note that there were files with more than 100 warnings, but as only 100 warnings are reported in the problems pane, most probably not all with usages were fixed. Execute the command again after the warnings were recalculated by the AL Extension.', 'Reload Window');
            if (answer == 'Reload Window')
                vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }

    static async fixExplicitWithUsages() {
        let allDocumentsWithDiagnosticOfAL0606: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics().filter(tuple => tuple[1].some(diagnostic => diagnostic.code && diagnostic.code === 'AL0606'));
        allDocumentsWithDiagnosticOfAL0606.forEach(tuple => tuple[1] = tuple[1].filter(diag => diag.code === 'AL0606'));
        if (allDocumentsWithDiagnosticOfAL0606.length === 0) {
            vscode.window.showInformationMessage('No warnings of type AL0606 found.');
            return;
        }
        let withDocumentAL0606Fixer: WithDocumentAL0606Fixer = new WithDocumentAL0606Fixer();
        CommandFixWithUsage.addDocumentsToFix(allDocumentsWithDiagnosticOfAL0606, withDocumentAL0606Fixer);
        await withDocumentAL0606Fixer.fixWithUsagesOfAllDocuments();
    }

    static async addPragmaImplicitWithDisable() {
        let uris: vscode.Uri[] = await vscode.workspace.findFiles('**/*.al');
        let searchPragmaDisable: RegExp = /^\s*#pragma implicitwith disable.*$/i;
        let searchPragmaRestore: RegExp = /^\s*#pragma implicitwith restore.*$/i;
        let searchObjectDeclaration: RegExp = /^((?:page|pageextension|table|tableextension|codeunit) \d+ (\w+|"[^"]+").*|\s+requestpage\s*)$/i;
        let numberOfAddedPragmas: number = 0;
        uris.forEach(uri => {
            let fileContent: string = fs.readFileSync(uri.fsPath, { encoding: 'utf8', flag: 'r' });
            let fileLines: string[] = fileContent.split('\r\n');
            let implicitWithDisabled: boolean = false;
            for (let i = 0; i < fileLines.length; i++) {
                if (searchPragmaDisable.test(fileLines[i]))
                    implicitWithDisabled = true;
                else if (searchPragmaRestore.test(fileLines[i]))
                    implicitWithDisabled = false;
                else if (!implicitWithDisabled && (searchObjectDeclaration.test(fileLines[i]))) {
                    fileLines.splice(0, 0, '#pragma implicitwith disable');
                    for (let a = fileLines.length - 1; a >= 0; a--)
                        if (fileLines[a].trim() == '')
                            fileLines.splice(a, 1);
                        else
                            break;
                    fileLines.push('#pragma implicitwith restore');
                    break;
                }
            }
            let fileContentNew: string = fileLines.join('\r\n');

            if (fileContentNew != fileContent) {
                fs.writeFileSync(uri.fsPath, fileContentNew, { encoding: 'utf8', flag: 'w' });
                numberOfAddedPragmas++;
            }
        });
        vscode.window.showInformationMessage('Added pragmas to ' + numberOfAddedPragmas + ' files.');
    }

    private static addDocumentsToFix(allDocumentsWithSpecifiedDiagnostics: [vscode.Uri, vscode.Diagnostic[]][], withDocumentFixer: WithDocumentFixer) {
        for (let i = 0; i < allDocumentsWithSpecifiedDiagnostics.length; i++) {
            withDocumentFixer.addDocument(allDocumentsWithSpecifiedDiagnostics[i][0]);
        }
    }
}