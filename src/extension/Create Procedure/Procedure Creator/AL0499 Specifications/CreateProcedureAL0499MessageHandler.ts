import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499MessageHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['MessageHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('Message', this.procedureName, false, 'Text[1024]', true)
        ];
    }
}