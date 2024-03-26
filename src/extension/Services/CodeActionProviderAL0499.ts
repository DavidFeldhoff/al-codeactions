import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { DocumentUtils } from '../Utils/documentUtils';
import { ICodeActionProvider } from "./ICodeActionProvider";
import { TextDocument, Diagnostic, CodeAction, CodeActionKind, CodeActionContext, CodeActionTriggerKind } from "vscode";
import { Command } from "../Entities/Command";
import { Config } from "../Utils/config";

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
    async considerLine(context: CodeActionContext): Promise<boolean> {
        if (context.only && !context.only.contains(CodeActionKind.QuickFix))
            return false;
        if (context.triggerKind == CodeActionTriggerKind.Automatic)
            if (!Config.getExecuteCodeActionsAutomatically(this.document.uri))
                return false;
        return true;
    }

    async createCodeActions(): Promise<CodeAction[]> {
        const codeAction = new CodeAction('Create HandlerFunction for ' + this.procedureName, CodeActionKind.QuickFix);
        codeAction.command = {
            command: Command.createHandlerCommand,
            title: 'Create HandlerFunction for ' + this.procedureName,
            arguments: [this.document, this.diagnostic]
        };
        return [codeAction];
    }
}