import * as vscode from 'vscode';
import { ICodeActionCreator } from "./ICodeActionCreator";
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { ALSourceCodeHandler } from "../../Utils/alSourceCodeHandler";
import { CreateProcedureAL0118 } from '../Procedure Creator/CreateProcedureAL0118';
import { CreateProcedure } from '../Procedure Creator/CreateProcedure';
import { ALProcedure } from '../../Entities/alProcedure';
import { CreateProcedureCommands } from '../CreateProcedureCommands';
import { CreateProcedureAL0118IntegrationEvent } from '../Procedure Creator/CreateProcedureAL0118IntegrationEvent';
import { CreateProcedureAL0118BusinessEvent } from '../Procedure Creator/CreateProcedureAL0118BusinessEvent';

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
        let codeActions: vscode.CodeAction[] = [];
        let createprocedureAL0118: CreateProcedureAL0118 = new CreateProcedureAL0118(this.document, this.diagnostic);
        let procedure: ALProcedure = await CreateProcedure.createProcedure(createprocedureAL0118);
        let codeActionProcedure: vscode.CodeAction = await this.createCodeAction(procedure, 'Create Procedure ' + procedure.name, this.document, this.diagnostic);
        codeActionProcedure.isPreferred = true;
        
        if (procedure.name.match(/^On[A-Z].*$/)) {
            codeActionProcedure.isPreferred = false;

            let createProcedureAL0118IntegrationEvent: CreateProcedureAL0118IntegrationEvent = new CreateProcedureAL0118IntegrationEvent(this.document, this.diagnostic);
            let integrationEvent: ALProcedure = await CreateProcedure.createProcedure(createProcedureAL0118IntegrationEvent);
            let codeActionIntegrationEvent: vscode.CodeAction = await this.createCodeAction(integrationEvent, 'Create IntegrationEvent Publisher ' + integrationEvent.name, this.document, this.diagnostic);
            codeActionIntegrationEvent.isPreferred = true;
            codeActions.push(codeActionIntegrationEvent);

            let createProcedureAL0118BusinessEvent: CreateProcedureAL0118BusinessEvent = new CreateProcedureAL0118BusinessEvent(this.document, this.diagnostic);
            let businessEvent: ALProcedure = await CreateProcedure.createProcedure(createProcedureAL0118BusinessEvent);
            let codeActionBusinessEvent: vscode.CodeAction = await this.createCodeAction(businessEvent, 'Create BusinessEvent Publisher ' + businessEvent.name, this.document, this.diagnostic);
            codeActions.push(codeActionBusinessEvent);
        }

        codeActions.push(codeActionProcedure);
        return codeActions;
    }

    private async createCodeAction(procedure: ALProcedure, msg: string, document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<vscode.CodeAction> {
        const codeAction = new vscode.CodeAction(msg, vscode.CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createProcedureCommand,
            title: 'Create Procedure',
            arguments: [document, diagnostic, procedure]
        };
        return codeAction;
    }
}