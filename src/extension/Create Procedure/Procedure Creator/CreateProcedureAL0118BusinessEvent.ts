import { Diagnostic, TextDocument } from 'vscode';
import { CreateProcedureAL0118 } from './CreateProcedureAL0118';
import { ICreateProcedure } from './ICreateProcedure';

export class CreateProcedureAL0118BusinessEvent extends CreateProcedureAL0118 implements ICreateProcedure {
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        super(document,diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['BusinessEvent(false)'];
    }
    async getReturnType(): Promise<string | undefined> {
        return undefined;
    }
    isVarForced(): boolean{
        return true;
    }
    getJumpToCreatedProcedure(): boolean {
        return false;
    }
}