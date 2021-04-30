import { readFileSync } from "fs"
import { EndOfLine, TextDocument, Uri, workspace } from "vscode"
import { DocumentUtils } from "../Utils/documentUtils"

export class Document {
    public fileContent: string
    public fileLines: string[]
    public eol: string
    public uri: Uri

    private constructor(uri: Uri, fileContent: string, fileLines: string[], eol: string) {
        this.uri = uri;
        this.fileContent = fileContent;
        this.fileLines = fileLines;
        this.eol = eol;
    }
    public static async load(uri: Uri): Promise<Document> {
        let fileContent, eol: string;
        let openedTextDoc: TextDocument | undefined = workspace.textDocuments.find(doc => doc.uri.fsPath == uri.fsPath)
        if (!openedTextDoc && uri.scheme == 'al-preview')
            openedTextDoc = await workspace.openTextDocument(uri)
        if (openedTextDoc) {
            fileContent = openedTextDoc.getText()
            switch (openedTextDoc.eol) {
                case EndOfLine.CRLF:
                    eol = '\r\n'
                    break;
                case EndOfLine.LF:
                    eol = '\n'
                    break;
            }
        }
        else {
            fileContent = readFileSync(uri.fsPath, { encoding: 'utf8' })
            eol = DocumentUtils.getEolByContent(fileContent)
        }
        let fileLines: string[] = fileContent.split(eol)
        return new Document(uri, fileContent, fileLines, eol)
    }
}