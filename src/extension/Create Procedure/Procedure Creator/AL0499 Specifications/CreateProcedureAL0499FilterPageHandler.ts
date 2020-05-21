import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499FilterPageHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['FilterPageHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('Record1', this.procedureName, true, 'RecordRef', true)
        ];
    }
    async getReturnType(): Promise<string | undefined> {
        return 'Boolean';
    }
}