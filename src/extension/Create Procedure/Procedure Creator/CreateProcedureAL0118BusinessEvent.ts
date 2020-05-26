import * as vscode from 'vscode';
import { CreateProcedureAL0118 } from './CreateProcedureAL0118';
import { ICreateProcedure } from './ICreateProcedure';

export class CreateProcedureAL0118BusinessEvent extends CreateProcedureAL0118 implements ICreateProcedure {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document,diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['BusinessEvent(false)'];
    }
    async getReturnType(): Promise<string | undefined> {
        return undefined;
    }
    getJumpToCreatedProcedure(): boolean {
        return false;
    }
}