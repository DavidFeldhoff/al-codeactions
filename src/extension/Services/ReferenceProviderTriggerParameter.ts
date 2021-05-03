import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { DocumentUtils } from "../Utils/documentUtils";
import { ReferenceProvider, TextDocument, Position, ReferenceContext, CancellationToken, Location, Range, commands } from "vscode";

export class ReferenceProviderTriggerParameter implements ReferenceProvider {

    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
        let locationsReferenced: Location[] = [];
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let parameterTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getParameter()]);
        if (!parameterTreeNode) {
            return;
        }
        let triggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (!triggerTreeNode) {
            return;
        }
        let parameterIdentifierTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position);
        if (!parameterIdentifierTreeNode) {
            return;
        }
        if (parameterIdentifierTreeNode && parameterIdentifierTreeNode.parentNode && parameterIdentifierTreeNode.parentNode.kind && parameterIdentifierTreeNode.parentNode.kind === FullSyntaxTreeNodeKind.getParameter()) {
            let parameterName: string = document.getText(TextRangeExt.createVSCodeRange(parameterIdentifierTreeNode.fullSpan));

            locationsReferenced = await this.getReferenceLocations(syntaxTree, document, position, parameterName);
        }
        return locationsReferenced;
    }

    private async getReferenceLocations(syntaxTree: SyntaxTree, document: TextDocument, position: Position, parameterName: string): Promise<Location[]> {
        let locationsReferenced: Location[] = [];
        locationsReferenced = locationsReferenced.concat(
            await this.getReferenceLocationsInSameDocument(syntaxTree, document, position, parameterName)
        );
        return locationsReferenced;
    }

    private async getReferenceLocationsInSameDocument(syntaxTree: SyntaxTree, document: TextDocument, position: Position, parameterName: string): Promise<Location[]> {
        let locationsReferenced: Location[] = [];

        let parameterTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getParameter()]) as ALFullSyntaxTreeNode;
        let triggerTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getTriggerDeclaration()]) as ALFullSyntaxTreeNode;
        let blockTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(triggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false);
        if (!blockTreeNode || !blockTreeNode.fullSpan) {
            return [];
        }
        let blockRange: Range = TextRangeExt.createVSCodeRange(blockTreeNode.fullSpan);
        for (let lineNo = blockRange.start.line; lineNo <= blockRange.end.line; lineNo++) {
            let lineText: string = document.lineAt(lineNo).text;
            if (lineNo === blockRange.start.line && lineNo !== blockRange.end.line) {
                lineText = lineText.substring(blockRange.start.character);
            } else if (lineNo === blockRange.start.line && lineNo === blockRange.end.line) {
                lineText = lineText.substring(blockRange.start.character, blockRange.end.character);
            } else if (lineNo === blockRange.end.line) {
                lineText = lineText.substring(0, blockRange.end.character);
            }
            let indexOfParameterName: number = lineText.search(new RegExp('\\b' + parameterName + '\\b', 'i'));
            while (indexOfParameterName !== -1) {
                let identifierOfUsedParameter: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(new Position(lineNo, indexOfParameterName), [FullSyntaxTreeNodeKind.getIdentifierName()]);
                if (!identifierOfUsedParameter) {
                    continue;
                }
                let rangeOfIdentifierOfUsedParameter: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierOfUsedParameter.fullSpan));
                if (rangeOfIdentifierOfUsedParameter.start.line === rangeOfIdentifierOfUsedParameter.end.line) {
                    indexOfParameterName = rangeOfIdentifierOfUsedParameter.end.character;
                } else {
                    indexOfParameterName = lineText.length - 1;
                }

                let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, new Position(lineNo, indexOfParameterName));
                if (locations && locations.length > 0) {
                    let location = locations[0];
                    let parameterRange: Range = TextRangeExt.createVSCodeRange(parameterTreeNode.fullSpan);
                    if (parameterRange.contains(location.range)) {
                        locationsReferenced.push(new Location(document.uri, rangeOfIdentifierOfUsedParameter));
                    }
                }

                let startAt: number = indexOfParameterName;
                let textAfterMatch = lineText.substr(startAt);
                indexOfParameterName = textAfterMatch.search(new RegExp('\\b' + parameterName + '\\b', 'i'));
                if(indexOfParameterName !== -1){
                    indexOfParameterName += startAt;
                }
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