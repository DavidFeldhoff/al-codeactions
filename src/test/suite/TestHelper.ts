import assert = require("assert");
import { Range, TextDocument } from "vscode";

export class TestHelper{
    public static getRangeOfLine(document: TextDocument, lineTextToSearch: string, startingAtLine: number = 0): Range {
		let line: number | undefined;
		for (let i = startingAtLine; i < document.lineCount; i++) {
			if (document.lineAt(i).text.trim() == lineTextToSearch) {
				line = i;
				break;
			}
		}
		assert.notStrictEqual(line, undefined, 'line should be found.');
		line = line as number;
		let lineText = document.lineAt(line).text;
		let startPos = lineText.indexOf(lineTextToSearch);
		let endPos = startPos + lineTextToSearch.length;
		return new Range(line, startPos, line, endPos);
	}
}