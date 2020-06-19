import { TextRangeExt } from './../AL Code Outline Ext/textRangeExt';
import { DocumentUtils } from './../documentUtils';
import { ALFullSyntaxTreeNodeExt } from './../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { ALFullSyntaxTreeNode } from './../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTree } from './../AL Code Outline/syntaxTree';
import * as vscode from 'vscode';

export class RefactorPageRun implements vscode.CodeActionProvider {

    async provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<vscode.CodeAction[]> {
        let diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(document.uri);
        if (!diagnostics.some(d => d.range.contains(range) && d.code && d.code === 'ALCodeActions001')) {
            return [];
        }
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let invocationNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
        if (invocationNode) {
            let argumentListNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationNode, FullSyntaxTreeNodeKind.getArgumentList(), false);
            if (argumentListNode && argumentListNode.childNodes) {
                let pageRecIdentifierNode: ALFullSyntaxTreeNode = argumentListNode.childNodes[1];
                let pageRecIdentifierName: string = document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(pageRecIdentifierNode.fullSpan)));
                let pageFieldIdentifierName: string | undefined;
                if (argumentListNode.childNodes.length > 2) {
                    return []; // currently not supported
                    // let pageFieldIdentifierNode: ALFullSyntaxTreeNode = argumentListNode.childNodes[2];
                    // pageFieldIdentifierName = document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(pageFieldIdentifierNode.fullSpan)));
                }
                let textToReplace: string = '';
                textToReplace = 'PageManagement.';
                let memberAccessExpression: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationNode, FullSyntaxTreeNodeKind.getMemberAccessExpression(), false);
                if (!memberAccessExpression || !memberAccessExpression.childNodes) {
                    return [];
                }
                let RunOrRunModalString: string = document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(memberAccessExpression.childNodes[1].fullSpan)));
                switch (RunOrRunModalString.toLowerCase()) {
                    case 'runmodal':
                        textToReplace += 'PageRunModal(';
                        break;
                    case 'run':
                        textToReplace += 'PageRun(';
                        break;
                    default:
                        return [];
                }
                textToReplace += pageRecIdentifierName;
                // if (pageFieldIdentifierName) {
                //     textToReplace += ', ' + pageFieldIdentifierName;
                // }
                textToReplace += ')';
                let invocationNodeRange: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(invocationNode.fullSpan));
                let codeAction: vscode.CodeAction = new vscode.CodeAction('Use PageManagement instead.', vscode.CodeActionKind.QuickFix);
                codeAction.edit = new vscode.WorkspaceEdit();
                codeAction.edit.replace(document.uri, invocationNodeRange, textToReplace);
                return [codeAction];
            }
        }
        return [];
    }
}