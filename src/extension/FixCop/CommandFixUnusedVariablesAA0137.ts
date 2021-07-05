import { readFileSync, writeFileSync } from "fs";
import { Position, ProgressLocation, Range, Uri, window } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { OwnConsole } from "../console";
import { ErrorLogUtils } from "../Terminal/ErrorLogUtils";
import { MyTerminal } from "../Terminal/terminal";
import { DocumentUtils } from "../Utils/documentUtils";
import { Err } from "../Utils/Err";
import { IFixCop } from "./IFixCop";

export class CommandFixUnusedVariablesAA0137 implements IFixCop {
    constructor() { }
    resolve(preScript?: string[]): void {
        let keepWarnings: string[] = ['AA0137']
        if (!preScript)
            preScript = []
        let self = this
        MyTerminal.getInstance().compileProject(this.compilationCallback.bind(self), { codeCop: true }, preScript, true, keepWarnings)
    }
    public async compilationCallback(errorLogIssues: ErrorLog.Issue[]) {
        let errorLogIssuesAA0137: ErrorLog.Issue[] = errorLogIssues.filter(errorLogIssue => errorLogIssue.ruleId == 'AA0137')

        let analyzedBuildOutputLines: { filePath: string; range: Range; variableName: string; }[] = this.analyzeAndSortBuildOutputLines(errorLogIssuesAA0137);
        let analyzedOutputLinesMappedToFile: Map<string, { range: Range; variableName: string; }[]> = this.getAnalyzedOutputLinesMappedToFile(analyzedBuildOutputLines);
        let variablesRemoved: number = 0
        let skippedNodesWithLocations: { uri: Uri, nodes: ALFullSyntaxTreeNode[] }[] = []
        if (analyzedBuildOutputLines.length != 0)
            await window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: 'Remove unused variables per file',
                    cancellable: false
                }, async (progress, token) => {
                    token.onCancellationRequested(() => {
                        window.showInformationMessage('Removing of unused variables canceled.');
                    });
                    progress.report({ increment: 0 })

                    let fileCounter: number = 0
                    for (const analyzedOutputLinesMappedToFileEntry of analyzedOutputLinesMappedToFile) {
                        let filePath: string = analyzedOutputLinesMappedToFileEntry[0]
                        let analyzedOutputLinesOfFile: { range: Range; variableName: string }[] = analyzedOutputLinesMappedToFileEntry[1]
                        let orgFileContent: string = readFileSync(filePath, { encoding: 'utf8' })
                        let fileLines: string[] = orgFileContent.split(DocumentUtils.getEolByContent(orgFileContent));

                        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(filePath, orgFileContent);
                        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, analyzedOutputLinesOfFile[0].range.start)
                        if (!objectTreeNode)
                            continue

                        let filteredAnalyzedOutputLinesOfFile: { range: Range; variableName: string }[] = this.filterValidAnalyzedOutputLinesOnly(fileLines, objectTreeNode, analyzedOutputLinesOfFile)

                        let varSections: ALFullSyntaxTreeNode[] = []
                        ALFullSyntaxTreeNodeExt.collectChildNodes(objectTreeNode, FullSyntaxTreeNodeKind.getGlobalVarSection(), false, varSections)
                        ALFullSyntaxTreeNodeExt.collectChildNodes(objectTreeNode, FullSyntaxTreeNodeKind.getVarSection(), true, varSections)
                        let analyzedOutputLinesPerVarSections: { node: ALFullSyntaxTreeNode; analyzedOutputLines: { range: Range; variableName: string; }[]; }[] = this.getAnalyzedOutputLinesPerVarSections(varSections, filteredAnalyzedOutputLinesOfFile);
                        let analyzedOutputLinesNotInVarSection: { returnOutputLines: { range: Range; variableName: string; }[]; skippedNodes: ALFullSyntaxTreeNode[] } = this.getAnalyzedOutputLinesNotInVarSections(filteredAnalyzedOutputLinesOfFile, analyzedOutputLinesPerVarSections, syntaxTree)
                        if (analyzedOutputLinesNotInVarSection.skippedNodes.length > 0)
                            skippedNodesWithLocations.push({ uri: Uri.file(filePath), nodes: analyzedOutputLinesNotInVarSection.skippedNodes })

                        for (const analyzedOutputLineOfReturnValue of analyzedOutputLinesNotInVarSection.returnOutputLines) {
                            let identifierNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(analyzedOutputLineOfReturnValue.range.start.translate(0, 1), [FullSyntaxTreeNodeKind.getIdentifierName()])
                            if (identifierNode) {
                                variablesRemoved++
                                let line: number = analyzedOutputLineOfReturnValue.range.start.line
                                fileLines[line] = fileLines[line].substr(0, identifierNode.fullSpan!.start!.character).trimRight() + fileLines[line].substr(identifierNode.fullSpan!.end!.character)
                            }
                        }
                        for (const analyzedOutputLinesPerVarSection of analyzedOutputLinesPerVarSections) {
                            let result: { fileLines: string[], variablesRemoved: number } = this.deleteVariablesOfVarSection(syntaxTree, fileLines, analyzedOutputLinesPerVarSection)
                            fileLines = result.fileLines
                            variablesRemoved += result.variablesRemoved
                        }
                        let newFileContent: string = fileLines.join('\r\n')
                        if (newFileContent != orgFileContent)
                            writeFileSync(filePath, newFileContent, { encoding: 'utf8' })
                        progress.report({ increment: 100 / analyzedOutputLinesMappedToFile.size, message: (++fileCounter) + '/' + analyzedOutputLinesMappedToFile.size })
                    }
                }
            )

        window.showInformationMessage('Done! See the result in the Output -> "AL Code Actions" window.')
        OwnConsole.ownConsole.clear();
        OwnConsole.ownConsole.show();
        OwnConsole.ownConsole.appendLine('Finished. Successfully removed variables: ' + variablesRemoved)
        if (skippedNodesWithLocations.length > 0) {
            OwnConsole.ownConsole.appendLine(`Please note that unused parameters are also taken into account with CodeCop AA0137, but these are not removed. There are ${skippedNodesWithLocations.map(entry => entry.nodes.length).reduce((sum, current) => sum + current, 0)} of them. You can inspect them here:`)
            for (const skippedNodesWithLocation of skippedNodesWithLocations)
                for (const skippedNode of skippedNodesWithLocation.nodes)
                    OwnConsole.ownConsole.appendLine(ErrorLogUtils.buildCompileLineBasedOnNode(skippedNodesWithLocation.uri, skippedNode))
        }
    }
    private getAnalyzedOutputLinesNotInVarSections(analyzedOutputLinesOfFile: { range: Range; variableName: string; }[], analyzedOutputLinesPerVarSections: { node: ALFullSyntaxTreeNode; analyzedOutputLines: { range: Range; variableName: string; }[]; }[], syntaxTree: SyntaxTree): { returnOutputLines: { range: Range; variableName: string; }[]; skippedNodes: ALFullSyntaxTreeNode[] } {
        let nodesSkipped: ALFullSyntaxTreeNode[] = []
        let linesNotInVarSection: { range: Range; variableName: string; }[] =
            analyzedOutputLinesOfFile
                .filter(analyzedLineOfFile => !analyzedOutputLinesPerVarSections
                    .some((analyzedOutputLinesOfVarSection) => analyzedOutputLinesOfVarSection.analyzedOutputLines
                        .some(analyzedLineOfVar =>
                            analyzedLineOfVar.variableName == analyzedLineOfFile.variableName &&
                            analyzedLineOfVar.range.start.compareTo(analyzedLineOfFile.range.start) == 0)))

        for (let i = 0; i < linesNotInVarSection.length; i++) {
            let pos: Position = linesNotInVarSection[i].range.start.translate(0, 1)
            let node: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(pos, [FullSyntaxTreeNodeKind.getReturnValue()])
            if (!node) {
                linesNotInVarSection.splice(i--, 1)
                let skippedNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(pos)!
                nodesSkipped.push(skippedNode);
                console.log('Skipped node: ' + skippedNode.kind + ', parent: ' + skippedNode.parentNode!.kind + ', parentsParent: ' + skippedNode.parentNode!.parentNode!.kind)
            }
        }
        return { returnOutputLines: linesNotInVarSection, skippedNodes: nodesSkipped }
    }
    private analyzeAndSortBuildOutputLines(errorLogIssuesAA0137: ErrorLog.Issue[]) {
        let analyzedBuildOutputLines: { filePath: string; range: Range; variableName: string }[] = [];
        for (const errorLogIssue of errorLogIssuesAA0137)
            analyzedBuildOutputLines.push(this.analyzeLine(errorLogIssue));

        analyzedBuildOutputLines = analyzedBuildOutputLines.sort((a, b) => {
            if (a.filePath == b.filePath) {
                return b.range.start.compareTo(a.range.start)
            }
            else
                return a.filePath.localeCompare(b.filePath);
        });
        return analyzedBuildOutputLines;
    }

    private filterValidAnalyzedOutputLinesOnly(fileLines: string[], objectTreeNode: ALFullSyntaxTreeNode, analyzedOutputLinesOfFile: { range: Range; variableName: string; }[]): { range: Range; variableName: string; }[] {
        let pageObject: ALFullSyntaxTreeNode | undefined
        if (objectTreeNode.kind == FullSyntaxTreeNodeKind.getPageObject())
            pageObject = objectTreeNode
        else if (objectTreeNode.kind == FullSyntaxTreeNodeKind.getReportObject())
            pageObject = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getRequestPage(), false)

        if (!pageObject)
            return analyzedOutputLinesOfFile

        let pageLabelNodes: ALFullSyntaxTreeNode[] = []
        ALFullSyntaxTreeNodeExt.collectChildNodes(pageObject, FullSyntaxTreeNodeKind.getPageLabel(), true, pageLabelNodes)

        let textOfPageLabels: string = ''
        for (const pageLabelNode of pageLabelNodes) {
            textOfPageLabels += fileLines.slice(pageLabelNode.fullSpan!.start!.line, pageLabelNode.fullSpan!.end!.line).join('\r\n')
        }
        for (let i = 0; i < analyzedOutputLinesOfFile.length; i++) {
            let regexSafeVariableName: string = analyzedOutputLinesOfFile[i].variableName.replace(/(.)/g, '[$1]')
            let regexp: RegExp = new RegExp('CaptionClass\\s*=.*\\b' + regexSafeVariableName + '\\b', 'i')
            if (regexp.test(textOfPageLabels)) {
                analyzedOutputLinesOfFile.splice(i--, 1)
            }
        }
        return analyzedOutputLinesOfFile
    }
    private getAnalyzedOutputLinesPerVarSections(varSections: ALFullSyntaxTreeNode[], analyzedOutputLinesOfFile: { range: Range; variableName: string; }[]) {
        let varSectionsRanges: { node: ALFullSyntaxTreeNode; range: Range; }[] = [];
        for (let varSection of varSections)
            varSectionsRanges.push({ node: varSection, range: TextRangeExt.createVSCodeRange(varSection.fullSpan) });
        varSectionsRanges = varSectionsRanges.sort((a, b) => b.range.start.compareTo(a.range.start));

        let analyzedOutputLinesPerVarSection: { node: ALFullSyntaxTreeNode; analyzedOutputLines: { range: Range; variableName: string; }[]; }[] = [];
        for (const varSectionRangeEntry of varSectionsRanges) {
            let analyzedOutputLines: { range: Range; variableName: string; }[] = analyzedOutputLinesOfFile.filter(entry => varSectionRangeEntry.range.contains(entry.range.start))
            if (analyzedOutputLines.length > 0)
                analyzedOutputLinesPerVarSection.push({
                    node: varSectionRangeEntry.node,
                    analyzedOutputLines: analyzedOutputLines
                });
        }
        return analyzedOutputLinesPerVarSection;
    }

    private deleteVariablesOfVarSection(syntaxTree: SyntaxTree, fileLines: string[], varSection: { node: ALFullSyntaxTreeNode; analyzedOutputLines: { range: Range; variableName: string; }[]; }): { fileLines: string[], variablesRemoved: number } {
        let variablesInVarSection: ALFullSyntaxTreeNode[] = []
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection.node, FullSyntaxTreeNodeKind.getVariableDeclaration(), false, variablesInVarSection)
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection.node, FullSyntaxTreeNodeKind.getVariableDeclarationName(), true, variablesInVarSection)

        let variablesRemoved: number = 0
        if (variablesInVarSection.length == varSection.analyzedOutputLines.length) {
            let rangeToDelete: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(varSection.node.fullSpan))
            fileLines.splice(rangeToDelete.start.line, rangeToDelete.end.line - rangeToDelete.start.line + 1)
            variablesRemoved = variablesInVarSection.length
        } else {
            let regexp: RegExp
            let regExpMatchArray: RegExpMatchArray | null
            for (const analyzedOutputLine of varSection.analyzedOutputLines) {
                let regexSafeVariableName: string = analyzedOutputLine.variableName.replace(/(.)/g, '[$1]')
                //match 'var1, ' in 'var1, var2 : Integer'
                regexp = new RegExp("^(\\s*)((?:\"" + regexSafeVariableName + "\"|\\b" + regexSafeVariableName + "\\b)\\s*,\\s*)(.*:\\s*\\w.*)")
                regExpMatchArray = regexp.exec(fileLines[analyzedOutputLine.range.start.line])
                if (regExpMatchArray && regExpMatchArray.length == 4) {
                    fileLines[analyzedOutputLine.range.start.line] = regExpMatchArray[1] + regExpMatchArray[3]
                    if (/^[^,]+ :.*$/.test(fileLines[analyzedOutputLine.range.start.line]))
                        fileLines[analyzedOutputLine.range.start.line] = fileLines[analyzedOutputLine.range.start.line].replace(' :', ':')
                    variablesRemoved++
                } else {
                    //match ', var2' in 'var1, var2 : Integer'
                    regexp = new RegExp("^(.*)(,\\s*(?:\"" + regexSafeVariableName + "\"|\\b" + regexSafeVariableName + "\\b))(.*:\\s*\\w.*)")
                    regExpMatchArray = regexp.exec(fileLines[analyzedOutputLine.range.start.line])
                    if (regExpMatchArray && regExpMatchArray.length == 4) {
                        fileLines[analyzedOutputLine.range.start.line] = regExpMatchArray[1] + regExpMatchArray[3]
                        if (/^[^,]+ :.*$/.test(fileLines[analyzedOutputLine.range.start.line]))
                            fileLines[analyzedOutputLine.range.start.line] = fileLines[analyzedOutputLine.range.start.line].replace(' :', ':')
                        variablesRemoved++
                    } else {
                        //match 'var1' in 'var1: Integer'
                        regexp = new RegExp("^(\\s*)(\"" + regexSafeVariableName + "\"|\\b" + regexSafeVariableName + "\\b)(\\s*:\\s*\\w.*)")
                        regExpMatchArray = regexp.exec(fileLines[analyzedOutputLine.range.start.line])
                        if (regExpMatchArray && regExpMatchArray.length == 4) {
                            let variableDeclarationNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(analyzedOutputLine.range.start, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableListDeclaration()])
                            if (variableDeclarationNode) {
                                //This is done to delete the annotations as well like [NonDebuggable], [InDataSet] and so on
                                let rangeToDelete: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(variableDeclarationNode.fullSpan))
                                fileLines.splice(rangeToDelete.start.line, rangeToDelete.end.line - rangeToDelete.start.line + 1)
                            }
                            variablesRemoved++
                        }
                    }
                }
            }
        }
        return { fileLines, variablesRemoved };
    }
    private getAnalyzedOutputLinesMappedToFile(analyzedBuildOutputLines: { filePath: string; range: Range; variableName: string; }[]) {
        let analyzedOutputLinesPerFile: Map<string, { range: Range; variableName: string; }[]> = new Map();
        for (const analyzedBuildOutputLine of analyzedBuildOutputLines) {
            if (!analyzedOutputLinesPerFile.get(analyzedBuildOutputLine.filePath)) {
                let linesOfFile: { range: Range; variableName: string; }[] = analyzedBuildOutputLines.
                    filter(line => line.filePath == analyzedBuildOutputLine.filePath)
                    .map((entry) => {
                        return { range: entry.range, variableName: entry.variableName };
                    });
                analyzedOutputLinesPerFile.set(analyzedBuildOutputLine.filePath, linesOfFile);
            }
        }
        return analyzedOutputLinesPerFile;
    }

    private analyzeLine(errorLogIssue: ErrorLog.Issue): { filePath: string; range: Range; variableName: string } {
        //Variable 'VersionMgt' is unused in 'FAVProductionBOMMgt'.
        let regexp: RegExp = /Variable \'([^\']+)\' is unused in \'.*\'./
        let regexpMatch: RegExpMatchArray | null = regexp.exec(errorLogIssue.shortMessage);
        if (!regexpMatch) {
            window.showErrorMessage('Unexpected error')
            Err._throw('Unexpected error.')
        }
        let filePath: string = ErrorLogUtils.getUri(errorLogIssue)
        let range: Range = ErrorLogUtils.getRange(errorLogIssue)
        let variableName: string = regexpMatch[1];
        return { filePath, range, variableName };
    }
}