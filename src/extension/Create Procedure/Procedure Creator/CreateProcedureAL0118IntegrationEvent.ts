import { Diagnostic, TextDocument } from 'vscode';
import { Config } from '../../Utils/config';
import { CreateProcedureAL0118 } from './CreateProcedureAL0118';
import { ICreateProcedure } from './ICreateProcedure';

export class CreateProcedureAL0118IntegrationEvent extends CreateProcedureAL0118 implements ICreateProcedure {
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        super(document, diagnostic);
    }
    getMemberAttributes(): string[] {
        return ['IntegrationEvent(false,false)'];
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