import *  as vscode from 'vscode';
import { ALProcedure } from "./alProcedure";

export class ALProcedureSourceCodeCreator{
    
    public static createProcedureDefinition(procedure: ALProcedure): string {
        let returnType = procedure.getReturnTypeAsString();
        let returnString = "";
        if (returnType !== "") {
            returnString = ": " + returnType;
        }

        let procedureDefinition = "";
        procedureDefinition += "    procedure " + procedure.name + "(" + procedure.getParametersAsString() + ")" + returnString + "\r\n";
        procedureDefinition += "    begin\r\n";
        procedureDefinition += "        Error('Procedure not implemented.');\r\n";
        procedureDefinition += "    end;";
        return procedureDefinition;
    }
    

    public static addLineBreaksToProcedureCall(document: vscode.TextDocument, position: vscode.Position, textToInsert: string) {
        if (document.getText(new vscode.Range(position, position.translate(0, 1))) === "}") {
            textToInsert = textToInsert + "\r\n";
        }
        else {
            textToInsert = "\r\n\r\n" + textToInsert;
        }
        return textToInsert;
    }
}