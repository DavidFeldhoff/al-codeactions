import * as vscode from 'vscode';
import { ICodeActionCreator } from "./ICodeActionCreator";
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { ICreateProcedure } from '../Procedure Creator/ICreateProcedure';
import { CreateProcedureAL0449 } from '../Procedure Creator/CreateProcedureAL0499';

export class CodeActionCreatorAL0499 implements ICodeActionCreator {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
    }
    async considerLine(): Promise<boolean> {
        return true;
    }

    async createCodeActions(): Promise<vscode.CodeAction[] | undefined> {
        return;
    }
}