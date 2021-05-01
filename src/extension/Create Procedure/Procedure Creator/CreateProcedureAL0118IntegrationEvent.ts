import * as vscode from 'vscode';
import { CreateProcedureAL0118 } from './CreateProcedureAL0118';
import { ICreateProcedure } from './ICreateProcedure';

export class CreateProcedureAL0118IntegrationEvent extends CreateProcedureAL0118 implements ICreateProcedure {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['IntegrationEvent(false,false)'];
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