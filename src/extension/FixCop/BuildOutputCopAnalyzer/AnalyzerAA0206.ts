import { readFileSync } from "fs";
import { commands, Location, Uri } from "vscode";
import { FullSyntaxTreeNodeKind } from "../../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNode } from "../../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { ErrorLogUtils } from "../../Terminal/ErrorLogUtils";
import { Err } from "../../Utils/Err";
import { Analyzer } from "./Analyzer";
import { Cops } from "./Cops";
import { AnalyzedOutputLine } from "./Entities/AnalyzedOutputLine";
import { AnalyzedOutputLineAA0206 } from "./Entities/AnalyzedOutputLineAA0206";

export class AnalyzerAA0206 extends Analyzer {
    analyzedLines!: AnalyzedOutputLineAA0206[];

    protected getCop(): Cops {
        return Cops.AA0206
    }
    protected analyzeLineExt(analyzedOutputLine: AnalyzedOutputLine): AnalyzedOutputLineAA0206 {
        let regexp: RegExp = /The variable \'([^\']+)\' is initialized but not used./
        let regexpMatch: RegExpMatchArray | null = regexp.exec(analyzedOutputLine.message);
        if (!regexpMatch)
            Err._throw('Unexpected error.')
        return new AnalyzedOutputLineAA0206(analyzedOutputLine, regexpMatch[1])
    }

    async extendAnalyzedLines() {
        let newAnalyzedLines: AnalyzedOutputLineAA0206[] = []
        this.sortDescending();
        let lastFilePath: string = ''
        let uri: Uri | undefined
        let syntaxTree: SyntaxTree | undefined
        for (const analyzedLine of this.analyzedLines) {
            if (lastFilePath != analyzedLine.filePath || !uri || !syntaxTree) {
                lastFilePath = analyzedLine.filePath
                uri = Uri.file(analyzedLine.filePath)
                syntaxTree = await SyntaxTree.getInstance2(analyzedLine.filePath, readFileSync(analyzedLine.filePath, { encoding: 'utf8' }))
            }
            let locationsVariableReferenced: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', uri, analyzedLine.range.start)
            if (locationsVariableReferenced) {
                for (const locationVariableReferenced of locationsVariableReferenced) {
                    let variableTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(locationVariableReferenced.range.start, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableListDeclaration()])
                    if (!variableTreeNode) {
                        let originalErrorLogIssue = analyzedLine.originalErrorLogIssue
                        originalErrorLogIssue.locations[0].analysisTarget[0].region = ErrorLogUtils.rangeToRegionJson(locationVariableReferenced.range)
                        let newAnalyzedOutputLine = new AnalyzedOutputLineAA0206(
                            {
                                filePath: analyzedLine.filePath,
                                message: analyzedLine.message,
                                originalErrorLogIssue: {
                                    fullMessage: analyzedLine.originalErrorLogIssue.fullMessage,
                                    shortMessage: analyzedLine.originalErrorLogIssue.shortMessage,
                                    properties: analyzedLine.originalErrorLogIssue.properties,
                                    ruleId: analyzedLine.originalErrorLogIssue.ruleId,
                                    locations: [{
                                        analysisTarget: [{
                                            region: ErrorLogUtils.rangeToRegionJson(locationVariableReferenced.range),
                                            uri: analyzedLine.originalErrorLogIssue.locations[0].analysisTarget[0].uri
                                        }]
                                    }]
                                },
                                range: locationVariableReferenced.range
                            }, analyzedLine.variableName)
                        newAnalyzedLines.push(newAnalyzedOutputLine)
                    }
                }
            }
        }
        this.analyzedLines = []
        for (const newAnalyzedLine of newAnalyzedLines)
            this.analyzedLines.push(newAnalyzedLine)
    }

    public sortDescending(): AnalyzerAA0206 {
        return super.sortDescendingImpl() as AnalyzerAA0206
    }
}