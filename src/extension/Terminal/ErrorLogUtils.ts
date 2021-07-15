import { Range, Uri } from "vscode"
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { Err } from "../Utils/Err";

export class ErrorLogUtils {
    public static getUri(issue: ErrorLog.Issue): string {
        if (issue.locations.length == 1 && issue.locations[0].analysisTarget.length == 1)
            return issue.locations[0].analysisTarget[0].uri
        Err._throw('URI could not be parsed out of ErrorLog Issue')
    }
    public static getRange(issue: ErrorLog.Issue): Range {
        if (issue.locations.length == 1 && issue.locations[0].analysisTarget.length == 1)
            return new Range(
                issue.locations[0].analysisTarget[0].region.startLine - 1,
                issue.locations[0].analysisTarget[0].region.startColumn - 1,
                issue.locations[0].analysisTarget[0].region.endLine - 1,
                issue.locations[0].analysisTarget[0].region.endColumn - 1
            );
        Err._throw('Range could not be parsed out of ErrorLog Issue')
    }
    public static rangeToRegionJson(range: Range): ErrorLog.IssueLocationAnalysisTargetRegion {
        return {
            startLine: range.start.line + 1,
            startColumn: range.start.character + 1,
            endLine: range.end.line + 1,
            endColumn: range.end.character + 1
        }
    }
    public static rebuildCompileLine(issue: ErrorLog.Issue) {
        let uri = this.getUri(issue);
        let range = this.getRange(issue);
        return uri + '(' + (range.start.line + 1) + ',' + (range.start.character + 1) + '): ' + issue.properties.severity + ' ' + issue.ruleId + ': ' + issue.shortMessage
    }
    public static buildCompileLineBasedOnNode(uri: Uri, node: ALFullSyntaxTreeNode) {
        let range = TextRangeExt.createVSCodeRange(node.fullSpan)
        return uri.fsPath + '(' + (range.start.line + 1) + ',' + (range.start.character + 1) + ')';
    }
}