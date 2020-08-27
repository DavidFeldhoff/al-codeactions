import * as fs from 'fs';
import * as vscode from 'vscode';
import { WithDocument } from './WithDocument';
import { WithDocumentFixer } from './WithDocumentFixer';

export class WithDocumentAL0604Fixer implements WithDocumentFixer {
    withDocuments: WithDocument[];
    noOfUsagesFixed: number;
    noOfDocsFixed: number;
    moreThan100Warnings: boolean;
    constructor() {
        this.withDocuments = [];
        this.noOfUsagesFixed = 0;
        this.noOfDocsFixed = 0;
        this.moreThan100Warnings = false;
    }
    addDocument(uri: vscode.Uri) {
        this.withDocuments.push(new WithDocument(uri));
    }
    async fixWithUsagesOfAllDocuments() {
        for (let i = 0; i < this.withDocuments.length; i++) {
            await this.fixImplicitWithUsagesOfDocument(this.withDocuments[i]);
        }
    }
    private async fixImplicitWithUsagesOfDocument(withDocument: WithDocument) {
        let implicitWithUsages: vscode.Diagnostic[] = withDocument.getAL0604Warnings();
        implicitWithUsages = implicitWithUsages.sort((a, b) => a.range.start.compareTo(b.range.start));
        if (implicitWithUsages.length >= 100)
            this.moreThan100Warnings = true;

        let filecontent: string = fs.readFileSync(withDocument.uri.fsPath, { encoding: 'utf8', flag: 'r' });
        let fileLines: string[] = filecontent.split('\n');
        let indentMap: Map<number, number> = new Map<number, number>();
        for (let i = 0; i < implicitWithUsages.length; i++) {
            let p: vscode.Position = implicitWithUsages[i].range.start;
            let indentUndefined: number | undefined = indentMap.get(p.line);
            let indent: number = indentUndefined ? indentUndefined : 0;
            fileLines[p.line] = fileLines[p.line].substr(0, p.character + indent) + 'Rec.' + fileLines[p.line].substr(p.character + indent);
            indentMap.set(p.line, indent + 4);
        }
        filecontent = fileLines.join('\n');
        fs.writeFileSync(withDocument.uri.fsPath, filecontent, { encoding: 'utf8', flag: 'w' });

        this.noOfUsagesFixed += implicitWithUsages.length;
        this.noOfDocsFixed++;
    }
    public getNoOfUsagesFixed(): number {
        return this.noOfUsagesFixed;
    }
    public getNoOfDocsFixed(): number {
        return this.noOfDocsFixed;
    }
}