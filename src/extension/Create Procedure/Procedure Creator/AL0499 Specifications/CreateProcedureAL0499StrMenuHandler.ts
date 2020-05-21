import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499StrMenuHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['StrMenuHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('Options', this.procedureName, false, 'Text[1024]', true),
            new ALVariable('Choice', this.procedureName, true, 'Integer', true),
            new ALVariable('Instruction', this.procedureName, false, 'Text[1024]', true)
        ];
    }
}