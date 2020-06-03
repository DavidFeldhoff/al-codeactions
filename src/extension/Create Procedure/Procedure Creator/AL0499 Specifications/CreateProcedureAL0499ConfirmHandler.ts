import * as vscode from 'vscode';
import { SyntaxTree } from '../../../AL Code Outline/syntaxTree';
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
            new ALVariable('Question', this.procedureName, false, 'Text[1024]', true),
            new ALVariable('Reply', this.procedureName, true, 'Boolean', true)
        ];
    }
    containsSnippet(): boolean {
        return false;
    }
}