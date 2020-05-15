import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { ALProcedure } from '../alProcedure';
import { ALProcedureCallParser } from '../alProcedureCallParser';
import { ALProcedureSourceCodeCreator } from '../alProcedureSourceCodeCreator';
import { SupportedDiagnosticCodes } from '../supportedDiagnosticCodes';
import { ALSourceCodeHandler } from '../alSourceCodeHandler';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';

export class ALCreateProcedureCA implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];


    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        let diagnostic = new ALSourceCodeHandler(document).getRelevantDiagnosticOfCurrentPosition(range);
        if (isUndefined(diagnostic)) {
            return;
        }

        if (!await this.considerLine(document, range, diagnostic)) {
            return;
        }

        let procedureToCreate: ALProcedure | undefined;
        procedureToCreate = await this.createProcedureObject(document, diagnostic);
        if (isUndefined(procedureToCreate)) {
            return;
        }

        let codeActionToCreateProcedure: vscode.CodeAction | undefined;
        codeActionToCreateProcedure = await this.createCodeAction(document, diagnostic, procedureToCreate);
        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            return [codeActionToCreateProcedure];
        }
    }

    private async considerLine(document: vscode.TextDocument, range: vscode.Range, diagnostic: vscode.Diagnostic): Promise<boolean> {
        let textLine = document.lineAt(diagnostic.range.end.line).text;
        if (textLine.length > diagnostic.range.end.character) {
            let nextCharacter = textLine.charAt(diagnostic.range.end.character);
            if (nextCharacter === '(') {
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document, true);
                let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
                if (invocationExpressionTreeNode) {
                    return true;
                }
            }
        }
        return false;
    }

    public async createProcedureObject(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<ALProcedure | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(diagnostic.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
        if (isUndefined(invocationExpressionTreeNode)) {
            return;
        } else {
            let alProcedureCreator = new ALProcedureCallParser(document, diagnostic);
            await alProcedureCreator.initialize();
            let procedureToCreate = await alProcedureCreator.getProcedure();
            return procedureToCreate;
        }
    }

    private async createCodeAction(currentDocument: vscode.TextDocument, diagnostic: vscode.Diagnostic, procedureToCreate: ALProcedure): Promise<vscode.CodeAction | undefined> {
        let codeActionToCreateProcedure: vscode.CodeAction | undefined;
        switch (diagnostic.code as string) {
            case SupportedDiagnosticCodes.AL0132.toString():
                if (!procedureToCreate.ObjectOfProcedure.documentUri.fsPath.endsWith('dal')) {
                    await vscode.workspace.openTextDocument(procedureToCreate.ObjectOfProcedure.documentUri).then(async otherDocument => {
                        if (!isUndefined(otherDocument)) {
                            codeActionToCreateProcedure = await this.createFixToCreateProcedure(procedureToCreate, otherDocument);
                        }
                    });
                }
                break;
            case SupportedDiagnosticCodes.AL0118.toString():
                codeActionToCreateProcedure = await this.createFixToCreateProcedure(procedureToCreate, currentDocument, diagnostic.range.start.line);
                break;
            default:
                return;
        }

        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            codeActionToCreateProcedure.isPreferred = true;
            return codeActionToCreateProcedure;
        }
    }

    private async createFixToCreateProcedure(procedure: ALProcedure, document: vscode.TextDocument, currentLineNo?: number): Promise<vscode.CodeAction> {
        const fix = new vscode.CodeAction(`Create procedure ${procedure.name}`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();

        let position: vscode.Position = await new ALSourceCodeHandler(document).getPositionToInsertProcedure(currentLineNo);
        let textToInsert = ALProcedureSourceCodeCreator.createProcedureDefinition(procedure);
        textToInsert = ALProcedureSourceCodeCreator.addLineBreaksToProcedureCall(document, position, textToInsert);
        fix.edit.insert(document.uri, position, textToInsert);
        return fix;
    }
}