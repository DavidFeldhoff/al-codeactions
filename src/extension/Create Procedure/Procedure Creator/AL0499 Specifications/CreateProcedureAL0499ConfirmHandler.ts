import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499ConfirmHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['ConfirmHandler'];
    }
    getBody(): string | undefined {
        return 'Reply := true;';
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('Question', 'Text[1024]', this.procedureName, false).sanitizeName(),
            new ALVariable('Reply', 'Boolean', this.procedureName, true).sanitizeName()
        ];
    }
    containsSnippet(): boolean {
        return false;
    }
}