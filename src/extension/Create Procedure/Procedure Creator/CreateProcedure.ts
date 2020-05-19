import * as vscode from 'vscode';
import { ICreateProcedure } from "./ICreateProcedure";
import { ALProcedure } from "../../Entities/alProcedure";
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from '../../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALVariable } from '../../Entities/alVariable';
import { ReturnTypeAnalzyer } from '../../Extract Procedure/returnTypeAnalyzer';

export class CreateProcedure {
    public static async createProcedure(procedureCreator: ICreateProcedure): Promise<ALProcedure> {
        await procedureCreator.initialize();
        return new ALProcedure(
            procedureCreator.getProcedureName(),
            await procedureCreator.getParameters(),
            await procedureCreator.getVariables(),
            await procedureCreator.getReturnType(),
            procedureCreator.isLocal(),
            await procedureCreator.getObject()
        );
    }

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

    static async createProcedureCallDefinition(document: vscode.TextDocument, rangeToExtract: vscode.Range, newProcedureName: string, parameters: ALVariable[], returnTypeAnalyzer: ReturnTypeAnalzyer): Promise<string> {
        let procedureCall: string = '';
        if (returnTypeAnalyzer.getAddVariableToCallingPosition()) {
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

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let ifTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(rangeToExtract.start, [FullSyntaxTreeNodeKind.getIfStatement()]);
        if (!ifTreeNode) {
            if (!document.lineAt(rangeToExtract.end.line).text.substr(rangeToExtract.end.character).startsWith(';')) {
                procedureCall += ';';
            }
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