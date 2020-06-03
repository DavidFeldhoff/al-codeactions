import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499RequestPageHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['RequestPageHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('${0:RequestPageToHandle}', this.procedureName, true, 'TestRequestPage ${0:RequestPageToHandle}', false)
        ];
    }
    containsSnippet(): boolean {
        return true;
    }
}