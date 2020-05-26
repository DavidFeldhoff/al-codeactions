import * as vscode from 'vscode';
import { ICreateProcedure } from "./ICreateProcedure";
import { ALProcedure } from "../../Entities/alProcedure";
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from '../../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALVariable } from '../../Entities/alVariable';
import { ReturnTypeAnalyzer } from '../../Extract Procedure/returnTypeAnalyzer';
import { TextRangeExt } from '../../AL Code Outline Ext/textRangeExt';

export class CreateProcedure {
    public static async createProcedure(procedureCreator: ICreateProcedure): Promise<ALProcedure> {
        await procedureCreator.initialize();
        let procedure: ALProcedure = new ALProcedure(
            procedureCreator.getProcedureName(),
            await procedureCreator.getParameters(),
            await procedureCreator.getVariables(),
            await procedureCreator.getReturnType(),
            procedureCreator.isLocal(),
            procedureCreator.getMemberAttributes(),
            procedureCreator.getJumpToCreatedProcedure(),
            await procedureCreator.getObject()
        );
        let body = procedureCreator.getBody();
        if (body) {
            procedure.setBody(body);
        }
        return procedure;
    }

    public static createProcedureDefinition(procedure: ALProcedure, withIndent: boolean): string {
        withIndent = true;
        let returnType = procedure.getReturnTypeAsString();
        let returnString = "";
        if (returnType !== "") {
            returnString = procedure.getReturnVariableName() + ": " + returnType;
        }
        let localString = "";
        if (procedure.isLocal) {
            localString = "local ";
        }

        let memberAttributes: string[] = procedure.getMemberAttributes();
        let procedureDefinition = "";
        memberAttributes.forEach(memberAttribute =>
            procedureDefinition += (withIndent ? "\t" : "") + "[" + memberAttribute + "]\r\n"
        );
        procedureDefinition += (withIndent ? "\t" : "") + localString + "procedure " + procedure.name + "(" + procedure.getParametersAsString() + ")" + returnString + "\r\n";
        if (procedure.variables && procedure.variables.length > 0) {
            procedureDefinition += (withIndent ? "\t" : "") + "var\r\n";
            procedure.variables.forEach(variable =>
                procedureDefinition += (withIndent ? "\t" : "") + "\t" + variable.getVariableDeclarationString() + ";\r\n"
            );
        }
        procedureDefinition += (withIndent ? "\t" : "") + "begin\r\n";
        if (!this.skipBody(procedure)) {
            procedureDefinition += (withIndent ? "\t" : "") + "\t" + procedure.getBody() + "\r\n";
        }
        procedureDefinition += (withIndent ? "\t" : "") + "end;";
        return procedureDefinition;
    }
    private static skipBody(procedure: ALProcedure): boolean {
        let attributesWithoutBody: string[] = [
            'integrationevent',
            'businessevent'
        ];
        for (let i = 0; i < attributesWithoutBody.length; i++) {
            if (procedure.memberAttributes.some(attr => attr.toLowerCase().startsWith(attributesWithoutBody[i]))) {
                return true;
            }
        }
        return false;
    }

    static async createProcedureCallDefinition(document: vscode.TextDocument, rangeToExtract: vscode.Range, newProcedureName: string, parameters: ALVariable[], returnTypeAnalyzer: ReturnTypeAnalyzer): Promise<string> {
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
        if (ifTreeNode && ifTreeNode.childNodes) {
            let rangeOfIfExpression: vscode.Range = TextRangeExt.createVSCodeRange(ifTreeNode.childNodes[0].fullSpan);
            if (rangeOfIfExpression.contains(rangeToExtract)) {
                return procedureCall;
            }
        }
        procedureCall += ';';
        return procedureCall;
    }


    public static addLineBreaksToProcedureCall(document: vscode.TextDocument, position: vscode.Position, textToInsert: string) {
        textToInsert = "\r\n" + textToInsert + "\r\n";
        return textToInsert;
    }
}