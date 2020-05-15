import * as vscode from "vscode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";

export class ALCreateHandlerFunctionReferences implements vscode.ReferenceProvider {

    async provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken): Promise<vscode.Location[] | undefined> {
        let locationsReferenced: vscode.Location[] = [];
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodIdentifierTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position);
        if (methodIdentifierTreeNode && methodIdentifierTreeNode.parentNode && methodIdentifierTreeNode.parentNode.kind && methodIdentifierTreeNode.parentNode.kind === FullSyntaxTreeNodeKind.getMethodDeclaration()) {
            let handlerFunctionName: string = document.getText(TextRangeExt.createVSCodeRange(methodIdentifierTreeNode.fullSpan));

            let methodTreeNode: ALFullSyntaxTreeNode = methodIdentifierTreeNode.parentNode;
            let isHandlerFunction: boolean = this.isHandlerFunction(methodTreeNode, document);
            if (!isHandlerFunction) {
                return;
            }
            locationsReferenced = this.getReferenceLocations(syntaxTree, document, handlerFunctionName);
        }
        return locationsReferenced;
    }

    private getReferenceLocations(syntaxTree: SyntaxTree, document: vscode.TextDocument, handlerFunctionName: string): vscode.Location[] {
        let locationsReferenced: vscode.Location[] = [];
        locationsReferenced = locationsReferenced.concat(this.getReferenceLocationsInSameDocument(syntaxTree, document, handlerFunctionName));
        return locationsReferenced;
    }

    private getReferenceLocationsInSameDocument(syntaxTree: SyntaxTree, document: vscode.TextDocument, handlerFunctionName: string): vscode.Location[] {
        let locationsReferenced: vscode.Location[] = [];
        let allmethods: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getMethodDeclaration());
        for (let i = 0; i < allmethods.length; i++) {
            let location: vscode.Location | undefined = this.getReferenceLocationOfMethod(allmethods[i], document, handlerFunctionName);
            if (location) {
                locationsReferenced.push(location);
            }
        }
        return locationsReferenced;
    }

    private getReferenceLocationOfMethod(method: ALFullSyntaxTreeNode, document: vscode.TextDocument, handlerFunctionName: string): vscode.Location | undefined {
        let memberAttributes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(method, FullSyntaxTreeNodeKind.getMemberAttribute(), false, memberAttributes);
        for (let i = 0; i < memberAttributes.length; i++) {
            let location: vscode.Location | undefined = this.getReferenceLocationOfMemberAttribute(memberAttributes[i], document, handlerFunctionName);
            if (location) {
                return location;
            }
        }
        return undefined;
    }
    private getReferenceLocationOfMemberAttribute(memberAttribute: ALFullSyntaxTreeNode, document: vscode.TextDocument, handlerFunctionName: string): vscode.Location | undefined {
        let memberIdentifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(memberAttribute, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!memberIdentifierTreeNode) {
            return undefined;
        }
        let range: vscode.Range = TextRangeExt.createVSCodeRange(memberIdentifierTreeNode.fullSpan);
        let identifier: string = document.getText(range);
        if (identifier.toLowerCase() !== 'handlerfunctions') {
            return undefined;
        }

        let handlerFunctionTreeNodes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(memberAttribute, FullSyntaxTreeNodeKind.getLiteralAttributeArgument(), true, handlerFunctionTreeNodes);
        for (let i = 0; i < handlerFunctionTreeNodes.length; i++) {
            let rangeOfHandlerFunctionUsed: vscode.Range = TextRangeExt.createVSCodeRange(handlerFunctionTreeNodes[i].fullSpan);
            let handlerFunction: string = document.getText(rangeOfHandlerFunctionUsed);
            handlerFunction = handlerFunction.substring(1, handlerFunction.length - 1);
            if (handlerFunction.toLowerCase() === handlerFunctionName.toLowerCase()) {
                return new vscode.Location(document.uri, rangeOfHandlerFunctionUsed);
            }
        }
        return undefined;
    }

    private isHandlerFunction(methodTreeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument) {
        let validHandlerFunctions: string[] = [
            'confirmhandler',
            'filterpagehandler',
            'hyperlinkhandler',
            'messagehandler',
            'modalpagehandler',
            'pagehandler',
            'recallnotificationhandler',
            'reporthandler',
            'requestpagehandler',
            'sendnotificationhandler',
            'sessionsettingshandler',
        ];

        let memberAttributes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(methodTreeNode, FullSyntaxTreeNodeKind.getMemberAttribute(), false, memberAttributes);
        for (let i = 0; i < memberAttributes.length; i++) {
            let memberAttribute = memberAttributes[i];
            let handlerIdentifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(memberAttribute, FullSyntaxTreeNodeKind.getIdentifierName(), false);
            if (handlerIdentifierTreeNode) {
                let range = TextRangeExt.createVSCodeRange(handlerIdentifierTreeNode.fullSpan);
                let handlerIdentifier: string = document.getText(range).toLowerCase();
                if (validHandlerFunctions.includes(handlerIdentifier)) {
                    return true;
                }
            }
        }
        return false;
    }
}