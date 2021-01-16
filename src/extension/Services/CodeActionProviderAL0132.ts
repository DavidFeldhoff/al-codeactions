import * as vscode from 'vscode';
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ALObject } from '../Entities/alObject';
import { ALProcedure } from '../Entities/alProcedure';
import { ALSourceCodeHandler } from "../Utils/alSourceCodeHandler";
import { CreateProcedureCommands } from '../Create Procedure/CreateProcedureCommands';
import { CreateProcedure } from '../Create Procedure/Procedure Creator/CreateProcedure';
import { CreateProcedureAL0132 } from '../Create Procedure/Procedure Creator/CreateProcedureAL0132';
import { ICodeActionProvider } from "./ICodeActionProvider";
import { WorkspaceUtils } from '../Utils/workspaceUtils';
import { CreateProcedureAL0132IntegrationEvent } from '../Create Procedure/Procedure Creator/CreateProcedureAL0132IntegrationEvent';
import { CreateProcedureAL0132BusinessEvent } from '../Create Procedure/Procedure Creator/CreateProcedureAL0132BusinessEvent';
import { Err } from '../Utils/Err';

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
            Err._throw('considerLine has to be called first.');
        }
        let codeActions: vscode.CodeAction[] = [];
        let procedure: ALProcedure = await CreateProcedure.createProcedure(this.createProcedureAL0132);
        if (!this.isValidDocument(procedure))
            return []
        let codeActionProcedure: vscode.CodeAction = await this.createCodeAction('Create procedure ' + procedure.name, this.diagnostic, procedure);
        codeActionProcedure.isPreferred = true;

        let prefixes: string[] | undefined = await WorkspaceUtils.findValidAppSourcePrefixes(this.document.uri);
        let regexPattern: RegExp = prefixes ? new RegExp("^(" + prefixes.join('|') + "|" + prefixes.join('_|') + "_)?On[A-Za-z].*$") : new RegExp("^On[A-Za-z].*$");
        if (procedure.name.match(regexPattern)) {
            let createProcedureAL0132IntegrationEvent: CreateProcedureAL0132IntegrationEvent = new CreateProcedureAL0132IntegrationEvent(this.document, this.diagnostic);
            let integrationEvent: ALProcedure = await CreateProcedure.createProcedure(createProcedureAL0132IntegrationEvent);
            let codeActionIntegrationEvent: vscode.CodeAction = await this.createCodeAction('Create IntegrationEvent Publisher ' + integrationEvent.name, this.diagnostic, integrationEvent);
            codeActionIntegrationEvent.isPreferred = true;
            codeActions.push(codeActionIntegrationEvent);

            let createProcedureAL0132BusinessEvent: CreateProcedureAL0132BusinessEvent = new CreateProcedureAL0132BusinessEvent(this.document, this.diagnostic);
            let businessEvent: ALProcedure = await CreateProcedure.createProcedure(createProcedureAL0132BusinessEvent);
            let codeActionBusinessEvent: vscode.CodeAction = await this.createCodeAction('Create BusinessEvent Publisher ' + businessEvent.name, this.diagnostic, businessEvent);//businessEvent, 'Create BusinessEvent Publisher ' + businessEvent.name, this.document, this.diagnostic);
            codeActions.push(codeActionBusinessEvent);
        } else
            codeActionProcedure.isPreferred = true
        codeActions.push(codeActionProcedure)
        return codeActions;
    }


    private canObjectContainProcedures(alObject: ALObject) {
        switch (alObject.type.toString().toLowerCase()) {
            case "enum":
                return false;
            default:
                return true;
        }
    }
    private isValidDocument(procedureToCreate: ALProcedure): boolean {
        if (procedureToCreate.ObjectOfProcedure.documentUri.fsPath.endsWith('dal'))
            return false
        return true
    }
    private async createCodeAction(msg: string, diagnostic: vscode.Diagnostic, procedureToCreate: ALProcedure): Promise<vscode.CodeAction> {
        let otherDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(procedureToCreate.ObjectOfProcedure.documentUri);
        let codeActionToCreateProcedure: vscode.CodeAction = this.createFixToCreateProcedure(msg, procedureToCreate, otherDocument, diagnostic);
        return codeActionToCreateProcedure;
    }

    private createFixToCreateProcedure(msg: string, procedure: ALProcedure, document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const codeAction = new vscode.CodeAction(msg, vscode.CodeActionKind.QuickFix);
        codeAction.command = {
            command: CreateProcedureCommands.createProcedureCommand,
            title: 'Create Procedure',
            arguments: [document, diagnostic, procedure]
        };
        return codeAction;
    }
}