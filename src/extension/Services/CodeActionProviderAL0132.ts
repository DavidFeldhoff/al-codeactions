import * as vscode from 'vscode';
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ALObject } from '../Entities/alObject';
import { ALProcedure } from '../Entities/alProcedure';
import { ALSourceCodeHandler } from "../Utils/alSourceCodeHandler";
import { CreateProcedureCommands } from '../Create Procedure/CreateProcedureCommands';
import { CreateProcedure } from '../Create Procedure/Procedure Creator/CreateProcedure';
import { CreateProcedureAL0132 } from '../Create Procedure/Procedure Creator/CreateProcedureAL0132';
import { ICodeActionProvider } from "./ICodeActionProvider";

export class CodeActionProviderAL0132 implements ICodeActionProvider {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    createProcedureAL0132: CreateProcedureAL0132 | undefined;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
    }
    async considerLine(): Promise<boolean> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        if (await new ALSourceCodeHandler(this.document).isInvocationExpression(this.diagnostic.range)) {
            this.createProcedureAL0132 = new CreateProcedureAL0132(this.document, this.diagnostic);
            let objectOfNewProcedure: ALObject = await this.createProcedureAL0132.getObject();
            if (this.canObjectContainProcedures(objectOfNewProcedure)) {
                return true;
            }
        }
        return false;
    }

    async createCodeActions(): Promise<vscode.CodeAction[]> {
        if (!this.createProcedureAL0132) {
            throw new Error('considerLine has to be called first.');
        }
        let procedure: ALProcedure = await CreateProcedure.createProcedure(this.createProcedureAL0132);
        let codeAction: vscode.CodeAction | undefined = await this.createCodeAction(this.document, this.diagnostic, procedure);
        return codeAction ? [codeAction] : [];
    }


    private canObjectContainProcedures(alObject: ALObject) {
        switch (alObject.type.toString().toLowerCase()) {
            case "enum":
                return false;
            default:
                return true;
        }
    }
    private async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, procedureToCreate: ALProcedure): Promise<vscode.CodeAction | undefined> {
        if (!procedureToCreate.ObjectOfProcedure.documentUri.fsPath.endsWith('dal')) {
            let otherDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(procedureToCreate.ObjectOfProcedure.documentUri);
            let codeActionToCreateProcedure: vscode.CodeAction | undefined = this.createFixToCreateProcedure(procedureToCreate, otherDocument, diagnostic);
            codeActionToCreateProcedure.isPreferred = true;
            return codeActionToCreateProcedure;
        }

        return undefined;
    }

    private createFixToCreateProcedure(procedure: ALProcedure, document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const codeAction = new vscode.CodeAction(`Create procedure ${procedure.name}`, vscode.CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createProcedureCommand,
            title: 'Create Procedure',
            arguments: [document, diagnostic, procedure]
        };
        return codeAction;
    }
}