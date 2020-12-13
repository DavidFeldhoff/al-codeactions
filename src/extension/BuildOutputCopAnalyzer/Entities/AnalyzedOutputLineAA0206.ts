import { AnalyzedOutputLine } from "./AnalyzedOutputLine";

export class AnalyzedOutputLineAA0206 extends AnalyzedOutputLine {
    variableName: string;
    constructor(analyzedOutputLine: AnalyzedOutputLine, variableName: string) {
        super(analyzedOutputLine.originalErrorLogIssue, analyzedOutputLine.filePath, analyzedOutputLine.range, analyzedOutputLine.message)
        this.variableName = variableName;
    }
}