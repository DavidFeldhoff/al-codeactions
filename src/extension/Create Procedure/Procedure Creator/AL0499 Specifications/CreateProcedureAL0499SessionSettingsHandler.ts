import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499SessionSettingsHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['SessionSettingsHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('SessionSettings', 'SessionSettings', this.procedureName, true).sanitizeName()
        ];
    }
    async getReturnType(): Promise<string | undefined> {
        return 'Boolean';
    }
    containsSnippet(): boolean {
        return false;
    }
}