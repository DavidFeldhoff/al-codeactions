import { AnalyzedOutputLine } from "./AnalyzedOutputLine";

export class AnalyzedOutputLineAA0137 extends AnalyzedOutputLine {
    variableName: string;
    procedureName: string;
    constructor(analyzedOutputLine: AnalyzedOutputLine, variableName: string, procedureName: string) {
        super(analyzedOutputLine.originalErrorLogIssue, analyzedOutputLine.filePath, analyzedOutputLine.range, analyzedOutputLine.message)
        this.variableName = variableName;
        this.procedureName = procedureName;
    }
}