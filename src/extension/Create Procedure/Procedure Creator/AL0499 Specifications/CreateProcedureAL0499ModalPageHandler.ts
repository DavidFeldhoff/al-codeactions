import * as vscode from 'vscode';
import { ALVariable } from '../../../Entities/alVariable';
import { CreateProcedureAL0499 } from '../CreateProcedureAL0499';

export class CreateProcedureAL0499ModalPageHandler extends CreateProcedureAL0499 {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['ModalPageHandler'];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [
            new ALVariable('${0:ModalPageToHandle}', 'TestPage ${0:ModalPageToHandle}', this.procedureName, true)
        ];
    }
    containsSnippet(): boolean {
        return true;
    }
}