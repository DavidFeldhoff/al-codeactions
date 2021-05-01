import * as vscode from "vscode";
import { CreateProcedureAL0132 } from "./CreateProcedureAL0132";
import { ICreateProcedure } from "./ICreateProcedure";

export class CreateProcedureAL0132BusinessEvent extends CreateProcedureAL0132 implements ICreateProcedure {
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        super(document, diagnostic);
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