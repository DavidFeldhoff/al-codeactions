import { CancellationToken, commands, DefinitionProvider, Location, Position, Range, TextDocument, workspace } from "vscode";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";

export class DefinitionProviderIntegrationEvent implements DefinitionProvider {
    async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Location | undefined> {
        let lineText: string = document.lineAt(position.line).text;
        if (!lineText.toLowerCase().includes('[eventsubscriber('))
            return;
        if (lineText.length - lineText.replace(',', '').length == 2)
            return;
        let currentWordRange: Range | undefined = document.getWordRangeAtPosition(position);
        if (!currentWordRange)
            return;
        let currentWord: string = document.getText(currentWordRange);
        let startRange: Range = new Range(currentWordRange.start.translate(0, -1), currentWordRange.start);
        let endRange: Range = new Range(currentWordRange.end, currentWordRange.end.translate(0, 1))
        if (!(document.getText(startRange) == '\'' && document.getText(endRange) == '\''))
            return;
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let attributeArgumentList: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getAttributeArgumentList()]);
        if (attributeArgumentList && attributeArgumentList.childNodes) {
            if (attributeArgumentList.childNodes[1].kind == FullSyntaxTreeNodeKind.getOptionAccessAttributeArgument()) {
                let attributeArgument = attributeArgumentList.childNodes[1];
                if (attributeArgument.childNodes && attributeArgument.childNodes[0].kind == FullSyntaxTreeNodeKind.getOptionAccessExpression()) {
                    let optionAccessTreeNode = attributeArgument.childNodes[0];
                    if (optionAccessTreeNode.childNodes) {
                        let range: Range = TextRangeExt.createVSCodeRange(optionAccessTreeNode.childNodes[1].fullSpan);
                        let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, range.start);
                        if (locations) {
                            let location = locations[0];
                            let otherDoc: TextDocument = await workspace.openTextDocument(location.uri);
                            let otherSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(otherDoc);
                            for (let line = 0; line < otherDoc.lineCount; line++) {
                                if (otherDoc.lineAt(line).text.toLowerCase().includes('procedure ' + currentWord.toLowerCase() + '(')) {
                                    let pos: number = otherDoc.lineAt(line).text.toLowerCase().indexOf('procedure ' + currentWord.toLowerCase()) + 'procedure '.length;
                                    let position = new Position(line, pos);
                                    let identifier: ALFullSyntaxTreeNode | undefined = otherSyntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getIdentifierName()]);
                                    if (identifier) {
                                        let identifierRange: Range = TextRangeExt.createVSCodeRange(identifier.fullSpan)
                                        return new Location(otherDoc.uri, identifierRange);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        return undefined;
    }
}