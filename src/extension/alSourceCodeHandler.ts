import * as vscode from 'vscode';
import { RegExpCreator } from './regexpCreator';
import { isNullOrUndefined, isUndefined, isNull } from 'util';
import { KeywordHandler } from './keywordHandler';
import { ALObject } from './alObject';

export class ALSourceCodeHandler {
    document: vscode.TextDocument;
    constructor(document: vscode.TextDocument) {
        this.document = document;
    }
    getALObjectOfDocument(): ALObject {
        let firstLine = this.document.lineAt(0).text;
        let execArray = RegExpCreator.matchObjectDeclarationLine.exec(firstLine);
        if(isNull(execArray) || isUndefined(execArray.groups)){
            throw new Error('Unable to resolve object declaration of document ' + this.document.uri.fsPath + '.');
        }
        return new ALObject(
            execArray.groups['objectName'],
            execArray.groups['objectType'],
            execArray.groups['objectId'] as unknown as number,
            this.document);
    }

    public getProcedureNameOfCurrentPosition(currentLine: number): string {
        this.document.lineAt(currentLine);
        const regex = RegExpCreator.matchProcedureOrTriggerDeclarationLine;
        for (let i = currentLine; i > 0; i--) {
            let execArray = regex.exec(this.document.lineAt(i).text);
            if (!isNullOrUndefined(execArray)) {
                return execArray[1];
            }
        }
        console.error("The current procedurename was not found starting at line " + currentLine + ".");
        throw new Error("");
    }

    public static mapVariableTypeToALObjectType(objectTypeOfDiagnosticMsg: string): string {
        switch (objectTypeOfDiagnosticMsg.toLowerCase()) {
            case "record":
                return "table";
            default:
                return objectTypeOfDiagnosticMsg.toLowerCase();
        }
    }
}