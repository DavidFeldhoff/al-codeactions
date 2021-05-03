import { Diagnostic, TextDocument } from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499FilterPageHandler extends CreateProcedureAL0499 {
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['FilterPageHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('Record1', 'RecordRef', this.procedureName, true).sanitizeName()
        ];
    }
    async getReturnType(): Promise<string | undefined> {
        return 'Boolean';
    }
    containsSnippet(): boolean {
        return false;
    }
    
}