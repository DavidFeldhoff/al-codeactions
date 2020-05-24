import * as vscode from 'vscode';
import { ICodeActionCreator } from "./ICodeActionCreator";
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { ALSourceCodeHandler } from "../../alSourceCodeHandler";
import { CreateProcedureAL0118 } from '../Procedure Creator/CreateProcedureAL0118';
import { CreateProcedure } from '../Procedure Creator/CreateProcedure';
import { ALProcedure } from '../../Entities/alProcedure';
import { CreateProcedureCommands } from '../CreateProcedureCommands';

export class CodeActionCreatorAL0118 implements ICodeActionCreator {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
    }
    async considerLine(): Promise<boolean> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        if (await new ALSourceCodeHandler(this.document).isInvocationExpression(this.diagnostic.range)) {
            return true;
        }
        return false;
    }

    async createCodeActions(): Promise<vscode.CodeAction[]> {
        let createprocedureAL0118: CreateProcedureAL0118 = new CreateProcedureAL0118(this.document, this.diagnostic);
        let procedure: ALProcedure = await CreateProcedure.createProcedure(createprocedureAL0118);
        let codeAction: vscode.CodeAction | undefined = await this.createCodeAction(this.document, this.diagnostic, procedure);
        return codeAction ? [codeAction] : [];
    }

    private async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, procedureToCreate: ALProcedure): Promise<vscode.CodeAction | undefined> {
        let codeActionToCreateProcedure: vscode.CodeAction =
            await this.createFixToCreateProcedure(procedureToCreate, currentDocument, diagnostic);

        return codeActionToCreateProcedure;
    }

    private async createFixToCreateProcedure(procedure: ALProcedure, document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<vscode.CodeAction> {
        const codeAction = new vscode.CodeAction(`Create procedure ${procedure.name}`, vscode.CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createProcedureCommand,
            title: 'Create Procedure',
            arguments: [document, diagnostic, procedure]
        };
        codeAction.isPreferred = true;
        return codeAction;
    }
}