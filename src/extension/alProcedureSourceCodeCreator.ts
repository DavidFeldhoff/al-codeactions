import *  as vscode from 'vscode';
import { ALProcedure } from "./alProcedure";
import { ALVariable } from './alVariable';
import { ReturnTypeAnalzyer } from './Extract Procedure/returnTypeAnalyzer';

export class ALProcedureSourceCodeCreator {
    public static createProcedureDefinition(procedure: ALProcedure): string {
        let returnType = procedure.getReturnTypeAsString();
        let returnString = "";
        if (returnType !== "") {
            returnString = procedure.getReturnVariableName() + ": " + returnType;
        }
        let localString = "";
        if (procedure.isLocal) {
            localString = "local ";
        }

        let procedureDefinition = "";
        procedureDefinition += "    " + localString + "procedure " + procedure.name + "(" + procedure.getParametersAsString() + ")" + returnString + "\r\n";
        if (procedure.variables && procedure.variables.length > 0) {
            procedureDefinition += "    var\r\n";
            procedure.variables.forEach(variable =>
                procedureDefinition += "        " + variable.getVariableDeclarationString() + ";\r\n"
            );
        }
        procedureDefinition += "    begin\r\n";
        procedureDefinition += "        " + procedure.getBody() + "\r\n";
        procedureDefinition += "    end;";
        return procedureDefinition;
    }

    static createProcedureCallDefinition(newProcedureName: string, parameters: ALVariable[], returnTypeAnalyzer: ReturnTypeAnalzyer): string {
        let procedureCall: string = '';
        if(returnTypeAnalyzer.getAddVariableToCallingPosition()){
            // TODO: If I add the returnedValue-Variable, I have to add it also to the variables
            // procedureCall += 'returnedValue := ';
        }
        procedureCall += newProcedureName + '(';
        for (let i = 0; i < parameters.length; i++) {
            if (i > 0) {
                procedureCall += ', ';
            }
            procedureCall += parameters[i].name;
        }
        procedureCall += ')';
        if(returnTypeAnalyzer.getAddSemicolon()){
            procedureCall += ';';
        }
        return procedureCall;
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