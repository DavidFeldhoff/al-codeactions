import { Diagnostic, TextDocument } from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499ModalPageHandler extends CreateProcedureAL0499 {
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['ModalPageHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('${0:v}', 'TestPage ${1}', this.procedureName, true)
        ];
    }
    containsSnippet(): boolean {
        return true;
    }
}