import * as vscode from 'vscode';
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { DocumentUtils } from '../Utils/documentUtils';
import { CreateProcedureCommands } from '../Create Procedure/CreateProcedureCommands';
import { ICodeActionProvider } from "./ICodeActionProvider";

export class CodeActionProviderAL0499 implements ICodeActionProvider {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    procedureName: string;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
        this.procedureName = DocumentUtils.getProcedureNameOfDiagnosticMessage(diagnostic.message);
    }
    async considerLine(): Promise<boolean> {
        return true;
    }

    async createCodeActions(): Promise<vscode.CodeAction[]> {
        const codeAction = new vscode.CodeAction('Create HandlerFunction for ' + this.procedureName, vscode.CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createHandlerCommand,
            title: 'Create HandlerFunction for ' + this.procedureName,
            arguments: [this.document, this.diagnostic]
        };
        return [codeAction];
    }
}