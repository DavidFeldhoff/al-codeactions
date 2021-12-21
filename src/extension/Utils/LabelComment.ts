import { Position, Range, TextDocument } from "vscode";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { TypeDetective } from "./typeDetective";

export class LabelComment {
    static async getCommentTextForLabel(document: TextDocument, stringLiteralRange: Range): Promise<string> {

        let commentText: string = '';

        let placeHolderArray = Array.from(new Set(document.getText(stringLiteralRange).match(/%[0-9]+/g)))
        if (placeHolderArray.length > 0) {
            commentText = ', Comment=\'';

            // put each placeholder into an array of placeholders according to their ordered position
            var orderedPlaceHolderArray: { placeHolder: string, defaultValue: string }[] = new Array;
            for (const placeHolder of placeHolderArray) {
                let placeHolderPosition: number = Number.parseInt(placeHolder.substring(1));
                let variableNameWhichReplacesPlaceholder: string | undefined = await this.findVariableNameWhichReplacesPlaceholder(document, stringLiteralRange.start, placeHolderPosition);
                if (!variableNameWhichReplacesPlaceholder)
                    variableNameWhichReplacesPlaceholder = ""
                orderedPlaceHolderArray[placeHolderPosition - 1] = { placeHolder: placeHolder, defaultValue: variableNameWhichReplacesPlaceholder };
            };

            // using a for loop so we can handle missing placeholders
            for (var i = 0; i < orderedPlaceHolderArray.length; i++) {
                if (i > 0)
                    commentText += '; '

                if (orderedPlaceHolderArray[i] != null) {
                    const placeHolderPosition: number = Number.parseInt(orderedPlaceHolderArray[i].placeHolder.substring(1));
                    commentText += `${orderedPlaceHolderArray[i].placeHolder}=\${${placeHolderPosition}:${orderedPlaceHolderArray[i].defaultValue}}`;
                } else {
                    commentText += `%${i + 1}=\${${i + 1}:<not used>}`
                }
            }
            commentText += '\''
        }
        return commentText
    }
    private static async findVariableNameWhichReplacesPlaceholder(document: TextDocument, position: Position, placeHolderPosition: number): Promise<string | undefined> {
        const syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document)
        const stringLiteralNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getStringLiteralValue()])!
        const literalExpression = stringLiteralNode.parentNode!
        if (literalExpression.parentNode?.kind == FullSyntaxTreeNodeKind.getArgumentList() &&
            literalExpression.parentNode.parentNode?.kind == FullSyntaxTreeNodeKind.getInvocationExpression()) {
            const argumentListNode = literalExpression.parentNode!
            const invocationExpressionNode: ALFullSyntaxTreeNode = argumentListNode.parentNode!;
            let identifierName: string | undefined
            if (invocationExpressionNode.childNodes![0].kind == FullSyntaxTreeNodeKind.getMemberAccessExpression())
                identifierName = document.getText(TextRangeExt.createVSCodeRange(invocationExpressionNode.childNodes![0].childNodes![1].fullSpan))
            else
                identifierName = document.getText(TextRangeExt.createVSCodeRange(invocationExpressionNode.childNodes![0].fullSpan))

            if (!identifierName)
                return undefined

            const validInvocations: { name: string, startAt: number }[] = [
                { name: "Error", startAt: 2 },
                { name: "StrSubstNo", startAt: 2 },
                { name: "Confirm", startAt: 3 },
                { name: "Message", startAt: 2 },
                { name: "SetFilter", startAt: 3 }
            ]
            const index = validInvocations.find((value) => value.name.toLowerCase() == identifierName!.toLowerCase())
            if (index) {
                let indexToCheck = (placeHolderPosition - 1) + (index.startAt - 1)
                if (argumentListNode.childNodes && argumentListNode.childNodes.length > indexToCheck) {
                    const typeDetective = new TypeDetective(document, argumentListNode.childNodes[indexToCheck])
                    await typeDetective.analyzeTypeOfTreeNode();
                    return typeDetective.getName(true)
                }
            }
        }
    }
}
