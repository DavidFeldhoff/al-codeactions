import { CodeAction, CodeActionContext, CodeActionKind, CodeActionTriggerKind, Range, TextDocument, TextEdit, WorkspaceEdit } from "vscode";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ALVariable } from "../Entities/alVariable";
import { ALVariableParser } from "../Entity Parser/alVariableParser";
import { WorkspaceEditUtils } from "../Utils/WorkspaceEditUtils";
import { ICodeActionProvider } from "./ICodeActionProvider";
import { Config } from "../Utils/config";

export class CodeActionProviderLocalVariableToGlobal implements ICodeActionProvider {
    document: TextDocument;
    range: Range;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }

    async considerLine(context: CodeActionContext): Promise<boolean> {
        if (context.only && !context.only.contains(CodeActionKind.QuickFix) && !context.only.contains(CodeActionKind.Refactor))
            return false;
        if (context.triggerKind == CodeActionTriggerKind.Automatic)
            if (!Config.getExecuteCodeActionsAutomatically(this.document.uri))
                return false;
        let currentIndent: number = this.document.lineAt(this.range.start.line).firstNonWhitespaceCharacterIndex
        let indentOfVar: number = currentIndent - 4
        for (let lineNo = this.range.start.line; lineNo > 0; lineNo--) {
            if (this.document.lineAt(lineNo).firstNonWhitespaceCharacterIndex == indentOfVar) {
                if (this.document.lineAt(lineNo).text.trim().toLowerCase() == 'var')
                    return true
                else
                    break;
            }
        }
        return false;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);

        let edit: WorkspaceEdit = new WorkspaceEdit();
        let varSection: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getVarSection()]);
        if (varSection) {
            this.moveLocalVariableToGlobal(syntaxTree, edit);
            if (edit.entries().length > 0) {
                let codeAction: CodeAction = new CodeAction('Make variable global', CodeActionKind.RefactorRewrite);
                codeAction.edit = edit;
                return [codeAction];
            }
        }
        return [];
    }
    private moveLocalVariableToGlobal(syntaxTree: SyntaxTree, edit: WorkspaceEdit): void {
        let variableDeclarationNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableDeclarationName()]);
        if (!variableDeclarationNode || !variableDeclarationNode.childNodes)
            return;

        let variable: ALVariable = ALVariableParser.parseVariableTreeNodeToALVariable(this.document, variableDeclarationNode);

        WorkspaceEditUtils.removeVariable(this.document, variableDeclarationNode, edit);
        this.addVariableToGlobalVarSection(syntaxTree, variable, edit);
    }
    private addVariableToGlobalVarSection(syntaxTree: SyntaxTree, variable: ALVariable, edit: WorkspaceEdit) {
        let objectNode: ALFullSyntaxTreeNode = SyntaxTreeExt.getObjectTreeNode(syntaxTree, this.range.start)!;
        if (objectNode.kind == FullSyntaxTreeNodeKind.getReportObject()) {
            let requestPageNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getRequestPage()]);
            if (requestPageNode)
                objectNode = requestPageNode;
        }
        let textEdit: TextEdit = WorkspaceEditUtils.addVariableToGlobalVarSection(objectNode, variable, this.document);
        edit.insert(this.document.uri, textEdit.range.start, textEdit.newText);
    }
}