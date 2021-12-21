import { CodeAction, CodeActionKind, commands, Location, Position, Range, SnippetString, TextDocument, TextEdit, TextLine, window, workspace, WorkspaceEdit } from "vscode";
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ApplicationInsights, EventName } from "../ApplicationInsights/applicationInsights";
import { ALVariable } from '../Entities/alVariable';
import { Command } from '../Entities/Command';
import { Config } from '../Utils/config';
import { DocumentUtils } from "../Utils/documentUtils";
import { LabelComment } from "../Utils/labelComment";
import { WorkspaceEditUtils } from '../Utils/WorkspaceEditUtils';
import { ICodeActionProvider } from "./ICodeActionProvider";

export class CodeActionProviderExtractLabel implements ICodeActionProvider {
    range: Range;
    document: TextDocument;
    stringLiteralTreeNode: ALFullSyntaxTreeNode | undefined;
    syntaxTree: SyntaxTree | undefined;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(): Promise<boolean> {
        let lineText: TextLine = this.document.lineAt(this.range.start.line);
        return lineText.text.includes('\'') && lineText.firstNonWhitespaceCharacterIndex > 4;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        this.stringLiteralTreeNode = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getStringLiteralValue()]);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (!this.stringLiteralTreeNode || !this.syntaxTree || !methodOrTriggerTreeNode)
            return [];

        let stringLiteralRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(this.stringLiteralTreeNode.fullSpan));
        let codeAction: CodeAction = new CodeAction('Extract to Label', CodeActionKind.RefactorExtract);
        codeAction.command = {
            command: Command.extractLabel,
            arguments: [this.document, this.range, stringLiteralRange, methodOrTriggerTreeNode],
            title: 'Extract Label'
        };
        return [codeAction];
    }
    public async runCommand(stringLiteralRange: Range, methodOrTriggerTreeNode: ALFullSyntaxTreeNode) {
        let { snippetMode, edit, snippetParams } = await this.getWorkspaceEditAndSnippetString(stringLiteralRange, methodOrTriggerTreeNode);

        if (snippetMode && snippetParams) {
            if (snippetParams.snippetString.value.match(/\{%\d+:\}/))
                ApplicationInsights.getInstance().trackEvent(EventName.CreateLabel, { originalText: this.document.lineAt(stringLiteralRange.start.line) })
            await workspace.applyEdit(edit);
            await window.activeTextEditor!.insertSnippet(snippetParams.snippetString, snippetParams.position, snippetParams.options)
        } else {
            await workspace.applyEdit(edit);
            let lastTextEdit = edit.entries().pop()?.[1].pop()!
            let linesAdded: number = (lastTextEdit.newText.length - lastTextEdit.newText.replace(/\r\n/g, '').length) / 2;
            await commands.executeCommand(Command.renameCommand, new Location(this.document.uri, stringLiteralRange.start.translate(linesAdded)));
        }
    }

    public async getWorkspaceEditAndSnippetString(stringLiteralRange: Range, methodOrTriggerTreeNode: ALFullSyntaxTreeNode) {
        let extractLabelCreatesComment: boolean = Config.getExtractToLabelCreatesComment(this.document.uri);
        let commentText: string = '';
        if (extractLabelCreatesComment)
            commentText = await LabelComment.getCommentTextForLabel(this.document, stringLiteralRange);
        let snippetMode: boolean = commentText != '';

        let cleanVariableName = 'newLabel';
        let edit: WorkspaceEdit = new WorkspaceEdit();
        edit.replace(this.document.uri, stringLiteralRange, cleanVariableName);

        let variableName = cleanVariableName;
        if (snippetMode)
            variableName = '${0:' + cleanVariableName + '}';
        let variable: ALVariable = new ALVariable(variableName, 'Label ' + this.document.getText(stringLiteralRange) + commentText);
        let textEdit: TextEdit = WorkspaceEditUtils.addVariableToLocalVarSection(methodOrTriggerTreeNode, variable, this.document);
        let snippetParams: { snippetString: SnippetString, position: Position, options: { undoStopBefore: boolean; undoStopAfter: boolean; } } | undefined
        if (snippetMode)
            snippetParams = {
                snippetString: new SnippetString(textEdit.newText),
                position: textEdit.range.start,
                options: { undoStopBefore: false, undoStopAfter: false }
            }
        else
            edit.insert(this.document.uri, textEdit.range.start, textEdit.newText);
        return { snippetMode, edit, snippetParams };
    }
}