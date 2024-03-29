import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { DefinitionProvider, TextDocument, Position, CancellationToken, Location, LocationLink, Range } from 'vscode';

export class DefinitionProviderHandlerFunctions implements DefinitionProvider {

    async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Location | Location[] | LocationLink[] | undefined> {
        let locations: Location[] = [];
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        if (!this.isPositionInAttributeOfHandlerFunction(syntaxTree, document, position)) {
            return;
        }
        let handlerFunction: string = document.getText(document.getWordRangeAtPosition(position));

        let methodTreeNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getMethodDeclaration());
        for (let i = 0; i < methodTreeNodes.length; i++) {
            let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodTreeNodes[i], FullSyntaxTreeNodeKind.getIdentifierName(), false);
            if (identifierTreeNode) {
                let rangeOfIdentifier: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
                let identifierName: string = document.getText(rangeOfIdentifier);
                if (identifierName.toLowerCase() === handlerFunction.toLowerCase()) {
                    locations.push(new Location(document.uri, rangeOfIdentifier));
                    break;
                }
            }
        }

        return locations;
    }
    isPositionInAttributeOfHandlerFunction(syntaxTree: SyntaxTree, document: TextDocument, position: Position): boolean {
        let literalAttributeArgument: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getLiteralAttributeArgument()]);
        if (!literalAttributeArgument) {
            return false;
        }
        let methodTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getMethodDeclaration()]);
        if (!methodTreeNode) {
            return false;
        }
        let memberAttribute: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getMemberAttribute()]);
        if (!memberAttribute) {
            return false;
        }
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(memberAttribute, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!identifierTreeNode) {
            return false;
        }
        let rangeOfIdentifier: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
        let identifier: string = document.getText(rangeOfIdentifier);
        return identifier.toLowerCase() === 'handlerfunctions';
    }

}