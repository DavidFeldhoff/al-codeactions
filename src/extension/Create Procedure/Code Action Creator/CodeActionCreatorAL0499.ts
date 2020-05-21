import * as vscode from 'vscode';
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { CreateProcedureCommands } from '../CreateProcedureCommands';
import { ICodeActionCreator } from "./ICodeActionCreator";

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
        const codeAction = new vscode.CodeAction('Create HandlerFunction', vscode.CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createHandlerCommand,
            title: 'Create HandlerFunction',
            arguments: [this.document, this.diagnostic]
        };
        return [codeAction];
    }
}