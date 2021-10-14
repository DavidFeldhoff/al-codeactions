import { Range, TextDocument } from "vscode";

export class LabelComment {
    static getCommentTextForLabel(document: TextDocument, stringLiteralRange: Range): string {

        let commentText: string = '';

        let placeHolderArray = Array.from(new Set(document.getText(stringLiteralRange).match(/%[0-9]+/g)))
        if (placeHolderArray.length > 0) {
            commentText = ', Comment=\'';

            // put each placeholder into an array of placeholders according to their ordered position
            var orderedPlaceHolderArray: string[] = new Array;
            placeHolderArray.forEach((placeHolder: string, indexNumber: number) => {
                let placeHolderPosition: number = Number.parseInt(placeHolder.substr(1));
                orderedPlaceHolderArray[placeHolderPosition - 1] = placeHolder;
            });

            // using a for loop so we can handle missing placeholders
            for (var i = 0; i < orderedPlaceHolderArray.length; i++) {
                if (i > 0)
                    commentText += '; '

                if (orderedPlaceHolderArray[i] != null) {
                    commentText += orderedPlaceHolderArray[i] + '=${' + orderedPlaceHolderArray[i].substr(1) + '}';
                } else {
                    commentText += '%' + (i + 1) + '=<not used>';
                }
            }

            commentText += '\''
        }


        return commentText
    }
}
