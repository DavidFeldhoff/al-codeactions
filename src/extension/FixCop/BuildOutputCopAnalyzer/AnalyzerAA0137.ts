import { Err } from "../../Utils/Err";
import { Analyzer } from "./Analyzer";
import { Cops } from "./Cops";
import { AnalyzedOutputLine } from "./Entities/AnalyzedOutputLine";
import { AnalyzedOutputLineAA0137 } from "./Entities/AnalyzedOutputLineAA0137";

export class AnalyzerAA0137 extends Analyzer {
    analyzedLines!: AnalyzedOutputLineAA0137[];

    protected getCop(): Cops {
        return Cops.AA0137;
    }
    protected analyzeLineExt(analyzedOutputLine: AnalyzedOutputLine): AnalyzedOutputLineAA0137 {
        let regexp: RegExp = /Variable \'([^\']+)\' is unused in \'([^\']+)\'./
        let regexpMatch: RegExpMatchArray | null = regexp.exec(analyzedOutputLine.message);
        if (!regexpMatch)
            Err._throw('Unexpected error.')

        return new AnalyzedOutputLineAA0137(analyzedOutputLine, regexpMatch[1], regexpMatch[2])
    }
    async extendAnalyzedLines() { }

    public sortDescending(): AnalyzerAA0137 {
        return super.sortDescendingImpl() as AnalyzerAA0137
    }
}