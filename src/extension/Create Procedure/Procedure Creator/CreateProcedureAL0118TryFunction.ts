import { Diagnostic, TextDocument } from 'vscode';
import { Config } from '../../Utils/config';
import { CreateProcedureAL0118 } from './CreateProcedureAL0118';
import { ICreateProcedure } from './ICreateProcedure';

export class CreateProcedureAL0118TryFunction extends CreateProcedureAL0118 implements ICreateProcedure {
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['TryFunction'];
    }
    async getReturnType(): Promise<string | undefined> {
        return undefined;
    }
    isVarForced(): boolean {
        return Config.getPublisherHasVarParametersOnly(this.document.uri);
    }
    getJumpToCreatedProcedure(): boolean {
        return false;
    }
}