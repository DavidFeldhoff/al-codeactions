import { Range } from "vscode";

export class AnalyzedOutputLine {
    originalErrorLogIssue: ErrorLog.Issue;
    filePath: string;
    range: Range;
    message: string;
    constructor(originalErrorLogIssue: ErrorLog.Issue, filePath: string, range: Range, message: string) {
        this.originalErrorLogIssue = originalErrorLogIssue;
        this.filePath = filePath;
        this.range = range;
        this.message = message
    }
}