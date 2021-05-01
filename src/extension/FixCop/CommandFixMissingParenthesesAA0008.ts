import { readFileSync, writeFileSync } from "fs";
import { window } from "vscode";
import { OwnConsole } from "../console";
import { MyTerminal } from "../Terminal/terminal";
import { DocumentUtils } from "../Utils/documentUtils";
import { AnalyzerAA0008 } from "./BuildOutputCopAnalyzer/AnalyzerAA0008";
import { AnalyzedOutputLineAA0008 } from "./BuildOutputCopAnalyzer/Entities/AnalyzedOutputLineAA0008";
import { IFixCop } from "./IFixCop";

export class CommandFixMissingParenthesesAA0008 implements IFixCop {
    constructor() { }
    resolve(preScript?: string[]): void {
        let keepWarnings: string[] = ['AA0008']
        if (!preScript)
            preScript = []
        let self = this
        MyTerminal.getInstance().compileProject(this.compilationCallback.bind(self), { codeCop: true }, preScript, true, keepWarnings)
    }
    public async compilationCallback(errorLogIssues: ErrorLog.Issue[]) {
        let analyzerAA0008: AnalyzerAA0008 = new AnalyzerAA0008(errorLogIssues);
        await analyzerAA0008.analyzeLines();
        analyzerAA0008 = analyzerAA0008.sortDescending();
        let analyzedLinesMissingParenthesis: AnalyzedOutputLineAA0008[] = analyzerAA0008.analyzedLines;
        let lastFilePath: string = '', fileContent: string = ''
        for (const analyzedLine of analyzedLinesMissingParenthesis) {
            if (analyzedLine.filePath != lastFilePath) {
                if (lastFilePath != '')
                    writeFileSync(lastFilePath, fileContent, { encoding: 'utf8' })
                fileContent = readFileSync(analyzedLine.filePath, { encoding: 'utf8' });
                lastFilePath = analyzedLine.filePath
            }
            let index = DocumentUtils.getIndexOfFileContent(fileContent, analyzedLine.range.end)
            fileContent = fileContent.substring(0, index) + '()' + fileContent.substring(index);
        }
        if (lastFilePath != '')
            writeFileSync(lastFilePath, fileContent, { encoding: 'utf8' })
        this.printFinishMessage(analyzedLinesMissingParenthesis.length)
    }
    private printFinishMessage(fixed: number) {
        window.showInformationMessage('Done! See the result in the Output -> "AL Code Actions" window.')
        OwnConsole.ownConsole.clear();
        OwnConsole.ownConsole.show();
        OwnConsole.ownConsole.appendLine('Successfully added parentheses: ' + fixed);
    }
}