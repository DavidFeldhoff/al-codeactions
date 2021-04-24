import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499ReportHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['ReportHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('${0:v}', 'Report ${1}', this.procedureName, true)
        ];
    }
    containsSnippet(): boolean {
        return true;
    }
}