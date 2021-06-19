import { CodeAction, CodeActionKind, Location, Range, TextDocument, TextEdit, TextLine, WorkspaceEdit } from "vscode";
import { Config } from '../Utils/config';

export class LabelComment {
    static getCommentTextForLabel(document: TextDocument, stringLiteralRange: Range): string {

        let commentText: string = ''
        if (Config.getExtractToLabelCreatesComment()) {
            let placeHolderArray = Array.from(new Set(document.getText(stringLiteralRange).match(/%[0-9]+/g)))
            if (placeHolderArray.length > 0) {
                commentText = ', comment=\''

                placeHolderArray.forEach((placeHolder: string, indexNumber: number) => {
                    if (indexNumber > 0)
                        commentText += ', '
                    commentText += placeHolder + '= '
                })

                commentText += '\''
            }
        }

        return commentText
    }
}
