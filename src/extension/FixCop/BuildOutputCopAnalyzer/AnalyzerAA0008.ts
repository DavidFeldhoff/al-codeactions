import { Err } from "../../Utils/Err";
import { Analyzer } from "./Analyzer";
import { Cops } from "./Cops";
import { AnalyzedOutputLine } from "./Entities/AnalyzedOutputLine";
import { AnalyzedOutputLineAA0008 } from "./Entities/AnalyzedOutputLineAA0008";

export class AnalyzerAA0008 extends Analyzer {
    analyzedLines!: AnalyzedOutputLineAA0008[];

    protected getCop(): Cops {
        return Cops.AA0008
    }
    async extendAnalyzedLines() { }
    protected analyzeLineExt(analyzedOutputLine: AnalyzedOutputLine): AnalyzedOutputLineAA0008 {
        //c:\Users\xgwsdfe\Documents\git\beat-core\app\src\codeunit\Cod5376926.FAVIncDocBarcodePDFco.al(87,25): warning AA0008: You must specify open and close parenthesis after 'AsBoolean'.
        let regexp: RegExp = /You must specify open and close parenthesis after \'([^\']+)\'./
        let regexpMatch: RegExpMatchArray | null = regexp.exec(analyzedOutputLine.message);
        if (!regexpMatch)
            Err._throw('Unexpected error.')

        return new AnalyzedOutputLineAA0008(analyzedOutputLine, regexpMatch[1])
    }
    async extendErrorLogIssue(errorLogIssue: ErrorLog.Issue) { }
    public sortDescending(): AnalyzerAA0008 {
        return super.sortDescendingImpl() as AnalyzerAA0008
    }
}