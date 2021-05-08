import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { DocumentUtils } from '../Utils/documentUtils';
import { CreateProcedureCommands } from '../Create Procedure/CreateProcedureCommands';
import { ICodeActionProvider } from "./ICodeActionProvider";
import { TextDocument, Diagnostic, CodeAction, CodeActionKind } from "vscode";

export class CodeActionProviderAL0499 implements ICodeActionProvider {
    syntaxTree: SyntaxTree | undefined;
    document: TextDocument;
    diagnostic: Diagnostic;
    procedureName: string;
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
        this.procedureName = DocumentUtils.getProcedureNameOfDiagnosticMessage(diagnostic.message);
    }
    async considerLine(): Promise<boolean> {
        return true;
    }

    async createCodeActions(): Promise<CodeAction[]> {
        const codeAction = new CodeAction('Create HandlerFunction for ' + this.procedureName, CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createHandlerCommand,
            title: 'Create HandlerFunction for ' + this.procedureName,
            arguments: [this.document, this.diagnostic]
        };
        return [codeAction];
    }
}