import * as vscode from 'vscode';
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { DocumentUtils } from '../../documentUtils';
import { CreateProcedureCommands } from '../CreateProcedureCommands';
import { ICodeActionCreator } from "./ICodeActionCreator";

export class CodeActionCreatorAL0499 implements ICodeActionCreator {
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

    async createCodeActions(): Promise<vscode.CodeAction[] | undefined> {
        const codeAction = new vscode.CodeAction('Create HandlerFunction for ' + this.procedureName, vscode.CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createHandlerCommand,
            title: 'Create HandlerFunction for ' + this.procedureName,
            arguments: [this.document, this.diagnostic]
        };
        return [codeAction];
    }
}