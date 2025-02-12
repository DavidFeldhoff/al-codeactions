import { CodeAction, CodeActionContext, CodeActionKind, CodeActionTriggerKind, commands, Location, Position, Range, Selection, SnippetString, TextDocument, TextEdit, TextEditorRevealType, TextLine, window, workspace, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import * as Telemetry from "../ApplicationInsights/applicationInsights";
import { ALVariable } from '../Entities/alVariable';
import { Command } from '../Entities/Command';
import { Config } from '../Utils/config';
import { DocumentUtils } from "../Utils/documentUtils";
import { LabelComment } from "../Utils/LabelComment";
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
    async considerLine(context: CodeActionContext): Promise<boolean> {
        if (context.only && !context.only.contains(CodeActionKind.QuickFix) && !context.only.contains(CodeActionKind.Refactor))
            return false;
        if (context.triggerKind == CodeActionTriggerKind.Automatic)
            if (!Config.getExecuteCodeActionsAutomatically(this.document.uri))
                return false;
        let lineText: TextLine = this.document.lineAt(this.range.start.line);
        return lineText.text.includes('\'') && lineText.firstNonWhitespaceCharacterIndex > 4;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        this.stringLiteralTreeNode = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getStringLiteralValue()]);
        let methodOrTriggerOrObjectTreeNode: ALFullSyntaxTreeNode | undefined = this.syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (!this.stringLiteralTreeNode || !this.syntaxTree)
            return [];
        if (!methodOrTriggerOrObjectTreeNode) {
            let objectTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.findParentNodeOfKind(this.stringLiteralTreeNode, FullSyntaxTreeNodeKind.getAllObjectKinds())
            if (!objectTreeNode)
                return [];
            methodOrTriggerOrObjectTreeNode = objectTreeNode;
        }

        let stringLiteralRange: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(this.stringLiteralTreeNode.fullSpan));
        let codeAction: CodeAction = new CodeAction('Extract to Label', CodeActionKind.RefactorExtract);
        let codeActionLockedLabel: CodeAction = new CodeAction('Extract to locked Label', CodeActionKind.RefactorExtract);
        codeAction.command = {
            command: Command.extractLabel,
            arguments: [this.document, this.range, stringLiteralRange, methodOrTriggerOrObjectTreeNode, false],
            title: codeAction.title
        };
        codeActionLockedLabel.command = {
            command: Command.extractLabel,
            arguments: [this.document, this.range, stringLiteralRange, methodOrTriggerOrObjectTreeNode, true],
            title: codeActionLockedLabel.title
        };
        return [codeAction, codeActionLockedLabel];
    }
    public async runCommand(stringLiteralRange: Range, methodOrTriggerOrObjectTreeNode: ALFullSyntaxTreeNode, lockLabel: boolean) {
        let result = await this.getWorkspaceEditAndSnippetString(stringLiteralRange, methodOrTriggerOrObjectTreeNode, lockLabel);
        if (!result)
            return
        let snippetMode = result.snippetMode;
        let edit = result.edit;
        let snippetParams = result.snippetParams;

        let telemetryOptions = { multipleReplacements: false, createdCommentWithPlaceholders: false, snippetMode: false }
        if (snippetMode && snippetParams) {
            telemetryOptions.snippetMode = true;
            telemetryOptions.createdCommentWithPlaceholders = /\{%\d+:\}/.test(snippetParams.snippetString.value)
            telemetryOptions.multipleReplacements = edit.entries().length >= 2;
            await workspace.applyEdit(edit);
            await window.activeTextEditor!.insertSnippet(snippetParams.snippetString, snippetParams.position, snippetParams.options)
        } else {
            await workspace.applyEdit(edit);
            telemetryOptions.multipleReplacements = edit.entries().length >= 3;
            let lastTextEdit = edit.entries().pop()?.[1].pop()!
            let lineDelta = 0
            if (lastTextEdit.range.start.line <= stringLiteralRange.start.line) {
                const newLineMatches: RegExpMatchArray | null = lastTextEdit.newText.match(/\r?\n/g)
                lineDelta = newLineMatches ? newLineMatches.length : 0;
            }
            await commands.executeCommand(Command.renameCommand, new Location(this.document.uri, stringLiteralRange.start.translate(lineDelta)));
        }
        Telemetry.trackEvent(Telemetry.EventName.ExtractToLabel, telemetryOptions)
    }

    public async getWorkspaceEditAndSnippetString(stringLiteralRange: Range, methodOrTriggerOrObjectTreeNode: ALFullSyntaxTreeNode, lockTranslation: boolean): Promise<{
        snippetMode: boolean; edit: WorkspaceEdit; snippetParams: {
            snippetString: SnippetString; position: Position; options: { undoStopBefore: boolean; undoStopAfter: boolean; };
        } | undefined;
    } | undefined> {
        let extractLabelCreatesComment: boolean = Config.getExtractToLabelCreatesComment(this.document.uri);
        let commentText: string = '', lockText: string = '';
        if (extractLabelCreatesComment)
            commentText = await LabelComment.getCommentTextForLabel(this.document, stringLiteralRange);
        let snippetMode: boolean = commentText != '';
        if (lockTranslation)
            lockText = ", Locked = true"

        let result: { stringLiteralsToReplaceToo: ALFullSyntaxTreeNode[], aborted: boolean } = await this.askForReplacementOfFurtherLiteralsWithSameText(stringLiteralRange);
        if (result.aborted)
            return undefined
        let stringLiteralsToReplaceToo = result.stringLiteralsToReplaceToo
        const globalVariableRequired: boolean = stringLiteralsToReplaceToo.some(node => ALFullSyntaxTreeNodeExt.findParentNodeOfKind(node, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()])?.fullSpan?.start?.line != methodOrTriggerOrObjectTreeNode.fullSpan!.start!.line)

        let cleanVariableName = 'NewLabel';
        let edit: WorkspaceEdit = new WorkspaceEdit();
        edit.replace(this.document.uri, stringLiteralRange, cleanVariableName);
        stringLiteralsToReplaceToo.forEach(literalNode => edit.replace(this.document.uri, DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(literalNode.fullSpan)), cleanVariableName));

        let variableName = cleanVariableName;
        if (snippetMode)
            variableName = '${0:' + cleanVariableName + '}';
        let variable: ALVariable = new ALVariable(variableName, 'Label ' + this.document.getText(stringLiteralRange) + commentText + lockText);
        let textEdit: TextEdit;
        if (FullSyntaxTreeNodeKind.getAllObjectKinds().includes(methodOrTriggerOrObjectTreeNode.kind!))
            textEdit = WorkspaceEditUtils.addVariableToGlobalVarSection(methodOrTriggerOrObjectTreeNode, variable, this.document);
        else if (globalVariableRequired)
            textEdit = WorkspaceEditUtils.addVariableToGlobalVarSection(ALFullSyntaxTreeNodeExt.findParentNodeOfKind(methodOrTriggerOrObjectTreeNode, FullSyntaxTreeNodeKind.getAllObjectKinds())!, variable, this.document);
        else
            textEdit = WorkspaceEditUtils.addVariableToLocalVarSection(methodOrTriggerOrObjectTreeNode, variable, this.document);
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

    private async askForReplacementOfFurtherLiteralsWithSameText(stringLiteralRange: Range): Promise<{ stringLiteralsToReplaceToo: ALFullSyntaxTreeNode[], aborted: boolean }> {
        if (!window.activeTextEditor)
            return { stringLiteralsToReplaceToo: [], aborted: true }
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        const stringToExtract = this.document.getText(stringLiteralRange);
        const stringLiteralNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(this.syntaxTree.getRoot(), [FullSyntaxTreeNodeKind.getStringLiteralValue()], true);
        const sameLiterals = stringLiteralNodes.filter(node => {
            const nodeRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(node.fullSpan));
            if (this.document.getText(nodeRange) == stringToExtract)
                return true;
            return false;
        });
        interface myPick { label: string; picked: boolean, range: Range, node: ALFullSyntaxTreeNode; };
        let stringLiteralsToReplaceToo: myPick[] | undefined = undefined;
        if (sameLiterals.length > 1) {
            const items: myPick[] = sameLiterals.map(node => {
                const nodeRange = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(node.fullSpan));
                return {
                    label: `Line ${nodeRange.start.line + 1} - ${this.document.lineAt(nodeRange.start.line).text}`,
                    picked: nodeRange.contains(stringLiteralRange),
                    range: nodeRange,
                    node: node
                };
            });

            const currentSelection = window.activeTextEditor.selection
            stringLiteralsToReplaceToo = await window.showQuickPick(items,
                {
                    canPickMany: true,
                    title: 'There are further occurences with the same label. Please select the ones you want to replace as well.',
                    onDidSelectItem: (item: myPick) => {
                        window.activeTextEditor!.revealRange(item.range, TextEditorRevealType.InCenter);
                        window.activeTextEditor!.selection = new Selection(item.range.start, item.range.end)
                    }
                });
            await window.showTextDocument(this.document)
            window.activeTextEditor.selection = currentSelection;
            window.activeTextEditor.revealRange(currentSelection, TextEditorRevealType.InCenter)
            if (!stringLiteralsToReplaceToo || stringLiteralsToReplaceToo.length == 0)
                return { stringLiteralsToReplaceToo: [], aborted: true }

            stringLiteralsToReplaceToo = stringLiteralsToReplaceToo.filter(entry => !entry.range.contains(stringLiteralRange))
        }
        return stringLiteralsToReplaceToo ? { stringLiteralsToReplaceToo: stringLiteralsToReplaceToo.map(entry => entry.node), aborted: false } : { stringLiteralsToReplaceToo: [], aborted: false }
    }
}
