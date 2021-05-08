import { Diagnostic, TextDocument } from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499StrMenuHandler extends CreateProcedureAL0499 {
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['StrMenuHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('Options', 'Text[1024]', this.procedureName, false).sanitizeName(),
            new ALVariable('Choice', 'Integer', this.procedureName, true).sanitizeName(),
            new ALVariable('Instruction', 'Text[1024]', this.procedureName, false).sanitizeName()
        ];
    }
    containsSnippet(): boolean {
        return false;
    }
}