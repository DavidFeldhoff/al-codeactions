import { Analyzer } from "./Analyzer";
import { Cops } from "./Cops";
import { AnalyzedOutputLine } from "./Entities/AnalyzedOutputLine";
import { AnalyzedOutputLineAA0206 } from "./Entities/AnalyzedOutputLineAA0206";

export class AnalyzerAA0206 extends Analyzer {
    analyzedLines!: AnalyzedOutputLineAA0206[];

    protected getCop(): Cops{
        return Cops.AA0206
    }
    protected analyzeLineExt(analyzedOutputLine: AnalyzedOutputLine): AnalyzedOutputLineAA0206 {
        let regexp: RegExp = /The variable \'([^\']+)\' is initialized but not used./
        let regexpMatch: RegExpMatchArray | null = regexp.exec(analyzedOutputLine.message);
        if (!regexpMatch)
            throw new Error('Unexpected error.')
        return new AnalyzedOutputLineAA0206(analyzedOutputLine, regexpMatch[1])
    }
    
    public sortDescending(): AnalyzerAA0206{
        return super.sortDescendingImpl() as AnalyzerAA0206
    }
}