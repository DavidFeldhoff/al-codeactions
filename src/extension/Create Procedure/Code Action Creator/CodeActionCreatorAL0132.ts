import * as vscode from 'vscode';
import { ICodeActionCreator } from "./ICodeActionCreator";
import { SyntaxTree } from "../../AL Code Outline/syntaxTree";
import { ALSourceCodeHandler } from "../../alSourceCodeHandler";
import { ICreateProcedure } from '../Procedure Creator/ICreateProcedure';
import { ALObject } from '../../Entities/alObject';
import { CreateProcedureAL0132 } from '../Procedure Creator/CreateProcedureAL0132';
import { CreateProcedure } from '../Procedure Creator/CreateProcedure';
import { ALProcedure } from '../../Entities/alProcedure';

export class CodeActionCreatorAL0132 implements ICodeActionCreator {
    syntaxTree: SyntaxTree | undefined;
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    createProcedureAL0132: CreateProcedureAL0132 | undefined;
    constructor(document: vscode.TextDocument, diagnostic: vscode.Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
    }
    async considerLine(): Promise<boolean> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document, true);
        if (await new ALSourceCodeHandler(this.document).isInvocationExpression(this.diagnostic.range)) {
            this.createProcedureAL0132 = new CreateProcedureAL0132(this.document, this.diagnostic);
            let objectOfNewProcedure: ALObject = await this.createProcedureAL0132.getObject();
            if (this.canObjectContainProcedures(objectOfNewProcedure)) {
                return true;
            }
        }
        return false;
    }

    async createCodeActions(): Promise<vscode.CodeAction[] | undefined> {
        if (!this.createProcedureAL0132) {
            throw new Error('considerLine has to be called first.');
        }
        let procedure: ALProcedure = await CreateProcedure.createProcedure(this.createProcedureAL0132);
        let codeAction: vscode.CodeAction | undefined = await this.createCodeAction(this.document, this.diagnostic, procedure);
        return codeAction ? [codeAction] : undefined;
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
            await vscode.workspace.openTextDocument(procedureToCreate.ObjectOfProcedure.documentUri).then(async otherDocument => {
                if (otherDocument) {
                    let codeActionToCreateProcedure: vscode.CodeAction | undefined = await this.createFixToCreateProcedure(procedureToCreate, otherDocument);
                    codeActionToCreateProcedure.isPreferred = true;
                    return codeActionToCreateProcedure;
                }
            });
        }
        return undefined;
    }

    private async createFixToCreateProcedure(procedure: ALProcedure, document: vscode.TextDocument, currentLineNo?: number): Promise<vscode.CodeAction> {

        let position: vscode.Position = await new ALSourceCodeHandler(document).getPositionToInsertProcedure(currentLineNo);
        let textToInsert = CreateProcedure.createProcedureDefinition(procedure);
        textToInsert = CreateProcedure.addLineBreaksToProcedureCall(document, position, textToInsert);

        const fix = new vscode.CodeAction(`Create procedure ${procedure.name}`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, position, textToInsert);
        return fix;
    }
}