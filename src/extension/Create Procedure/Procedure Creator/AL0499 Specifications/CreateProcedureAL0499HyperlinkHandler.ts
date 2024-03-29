import { Diagnostic, TextDocument } from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499HyperlinkHandler extends CreateProcedureAL0499 {
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['HyperlinkHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('Message', 'Text[1024]', this.procedureName, false).sanitizeName()
        ];
    }
    containsSnippet(): boolean {
        return false;
    }
}