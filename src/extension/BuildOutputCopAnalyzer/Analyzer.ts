import { ErrorLogUtils } from "../Terminal/ErrorLogUtils";
import { Cops } from "./Cops";
import { AnalyzedOutputLine } from "./Entities/AnalyzedOutputLine";

export abstract class Analyzer {
    private errorLogIssues: ErrorLog.Issue[]
    private regexp: RegExp = /(.*)\((\d+),(\d+)\): (?:info|warning|error) (?:\w{2,3}\d{4}): (.*)/;
    analyzedLines: AnalyzedOutputLine[];
    constructor(errorLogIssues: ErrorLog.Issue[]) {
        this.errorLogIssues = this.filterLines(errorLogIssues)
        this.analyzedLines = this.analyzeLines()
    }
    filterLines(errorLogIssues: ErrorLog.Issue[]): ErrorLog.Issue[] {
        return errorLogIssues.filter(issue => issue.ruleId == Cops[this.getCop()])
    }
    protected abstract getCop(): Cops;
    private analyzeLines() {
        this.analyzedLines = []
        for (const errorLogIssue of this.errorLogIssues) {
            let analyzedLine = this.analyzeLineBasic(errorLogIssue)
            let analyzedLineExt = this.analyzeLineExt(analyzedLine)
            this.analyzedLines.push(analyzedLineExt)
        }
        return this.analyzedLines;
    }
    protected analyzeLineBasic(errorLogIssue: ErrorLog.Issue): AnalyzedOutputLine {
        return new AnalyzedOutputLine(errorLogIssue, ErrorLogUtils.getUri(errorLogIssue), ErrorLogUtils.getRange(errorLogIssue), errorLogIssue.shortMessage)
    }
    protected abstract analyzeLineExt(analyzedLine: AnalyzedOutputLine): AnalyzedOutputLine;

    public abstract sortDescending(): Analyzer;
    protected sortDescendingImpl(): Analyzer {
        this.analyzedLines = this.analyzedLines.sort((a, b) => {
            if (a.filePath == b.filePath) {
                return b.range.start.compareTo(a.range.start)
            } else {
                return a.filePath.localeCompare(b.filePath)
            }
        })
        return this
    }
}