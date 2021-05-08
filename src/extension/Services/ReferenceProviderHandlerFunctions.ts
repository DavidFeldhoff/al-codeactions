import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ReferenceProvider, TextDocument, Position, ReferenceContext, CancellationToken, Location, Range } from "vscode";

export class ReferenceProviderHandlerFunctions implements ReferenceProvider {

    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
        let locationsReferenced: Location[] = [];
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

    private getReferenceLocations(syntaxTree: SyntaxTree, document: TextDocument, handlerFunctionName: string): Location[] {
        let locationsReferenced: Location[] = [];
        locationsReferenced = locationsReferenced.concat(
            this.getReferenceLocationsInSameDocument(syntaxTree, document, handlerFunctionName)
        );
        return locationsReferenced;
    }

    private getReferenceLocationsInSameDocument(syntaxTree: SyntaxTree, document: TextDocument, handlerFunctionName: string): Location[] {
        let locationsReferenced: Location[] = [];
        let allmethods: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getMethodDeclaration());
        for (let i = 0; i < allmethods.length; i++) {
            let location: Location | undefined = this.getReferenceLocationOfMethod(allmethods[i], document, handlerFunctionName);
            if (location) {
                locationsReferenced.push(location);
            }
        }
        return locationsReferenced;
    }

    private getReferenceLocationOfMethod(method: ALFullSyntaxTreeNode, document: TextDocument, handlerFunctionName: string): Location | undefined {
        let memberAttributes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(method, FullSyntaxTreeNodeKind.getMemberAttribute(), false, memberAttributes);
        for (let i = 0; i < memberAttributes.length; i++) {
            let location: Location | undefined = this.getReferenceLocationOfMemberAttribute(memberAttributes[i], document, handlerFunctionName);
            if (location) {
                return location;
            }
        }
        return undefined;
    }
    private getReferenceLocationOfMemberAttribute(memberAttribute: ALFullSyntaxTreeNode, document: TextDocument, handlerFunctionName: string): Location | undefined {
        let memberIdentifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(memberAttribute, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (!memberIdentifierTreeNode) {
            return undefined;
        }
        let range: Range = TextRangeExt.createVSCodeRange(memberIdentifierTreeNode.fullSpan);
        let identifier: string = document.getText(range);
        if (identifier.toLowerCase() !== 'handlerfunctions') {
            return undefined;
        }

        let handlerFunctionsTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(memberAttribute, FullSyntaxTreeNodeKind.getLiteralAttributeArgument(), true);
        if (handlerFunctionsTreeNode) {
            let rangeOfFunctions: Range = TextRangeExt.createVSCodeRange(handlerFunctionsTreeNode.fullSpan);
            let startCharacter: number = rangeOfFunctions.start.character;
            let handlerFunctionsString: string = document.getText(rangeOfFunctions);
            if (handlerFunctionsString.trim() !== '') {
                handlerFunctionsString = handlerFunctionsString.substring(1, handlerFunctionsString.length - 1);
                startCharacter++; // due to the removed '
                let handlerFunctionsArr = handlerFunctionsString.split(',');
                for (let i = 0; i < handlerFunctionsArr.length; i++) {
                    if (handlerFunctionsArr[i].toLowerCase() === handlerFunctionName.toLowerCase()) {
                        let wordRange: Range | undefined = document.getWordRangeAtPosition(new Position(rangeOfFunctions.start.line, startCharacter));
                        if (wordRange) {
                            return new Location(document.uri, wordRange);
                        }
                    }
                    startCharacter += handlerFunctionsArr[i].length + 1; // due to the removed , by split
                }
            }
        }
        return undefined;
    }

    private isHandlerFunction(methodTreeNode: ALFullSyntaxTreeNode, document: TextDocument) {
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
            'strmenuhandler'
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