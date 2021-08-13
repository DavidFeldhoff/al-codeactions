import { Position, Range, TextDocument } from 'vscode';
import { FullSyntaxTreeNodeKind } from '../../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { AccessModifier } from '../../Entities/accessModifier';
import { ALProcedure } from "../../Entities/alProcedure";
import { ALVariable } from '../../Entities/alVariable';
import { ReturnTypeAnalyzer } from '../../Extract Procedure/returnTypeAnalyzer';
import { DocumentUtils } from '../../Utils/documentUtils';
import { ICreateProcedure } from "./ICreateProcedure";

export class CreateProcedure {
    private lineOfBodyStart: number | undefined;
    public static async createProcedure(procedureCreator: ICreateProcedure): Promise<ALProcedure> {
        await procedureCreator.initialize();
        let procedure: ALProcedure = new ALProcedure(
            procedureCreator.getProcedureName(),
            await procedureCreator.getParameters(),
            await procedureCreator.getVariables(),
            await procedureCreator.getReturnType(),
            procedureCreator.getAccessModifier(),
            procedureCreator.getMemberAttributes(),
            procedureCreator.getJumpToCreatedProcedure(),
            procedureCreator.containsSnippet(),
            await procedureCreator.getObject(),
            await procedureCreator.isReturnTypeRequired()
        );
        let body = procedureCreator.getBody();
        if (body) {
            procedure.setBody(body);
        }
        return procedure;
    }

    public createProcedureDefinition(procedure: ALProcedure, withIndent: boolean, declarationOnly: boolean): string {
        withIndent = true;
        let returnType = procedure.getReturnTypeAsString();
        let returnString = "";
        if (returnType !== "") {
            returnString = procedure.getReturnVariableName() + ": " + returnType;
        }

        let memberAttributes: string[] = procedure.getMemberAttributes();
        let procedureDefinition = "";
        let tab = ''.padStart(4, ' ');
        for (const memberAttribute of memberAttributes)
            procedureDefinition += (withIndent ? tab : "") + "[" + memberAttribute + "]\r\n"
        let prefixAccessModifier: string;
        switch (procedure.accessModifier) {
            case AccessModifier.local:
                prefixAccessModifier = 'local '
                break;
            case AccessModifier.protected:
                prefixAccessModifier = 'protected ';
                break;
            case AccessModifier.internal:
                prefixAccessModifier = 'internal ';
                break;
            default:
                prefixAccessModifier = '';
                break;
        }
        procedureDefinition += (withIndent ? tab : "") + prefixAccessModifier + "procedure " + procedure.name + "(" + procedure.getParametersAsString() + ")" + returnString;
        if (declarationOnly) {
            this.lineOfBodyStart = 0 as number;
            return procedureDefinition + ';';
        }
        procedureDefinition += "\r\n";
        if (procedure.variables && procedure.variables.length > 0) {
            procedureDefinition += (withIndent ? tab : "") + "var\r\n";
            procedure.variables.forEach(variable =>
                procedureDefinition += (withIndent ? tab : "") + tab + variable.getVariableDeclarationString() + ";\r\n"
            );
        }
        procedureDefinition += (withIndent ? tab : "") + "begin\r\n";
        if (!this.skipBody(procedure)) {
            this.lineOfBodyStart = procedureDefinition.match(/\r\n/g)?.length as number;
            procedureDefinition += (withIndent ? tab : "") + tab + procedure.getBody() + "\r\n";
        }
        procedureDefinition += (withIndent ? tab : "") + "end;";
        return procedureDefinition;
    }
    private skipBody(procedure: ALProcedure): boolean {
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

    static async createProcedureCallDefinition(document: TextDocument, rangeToExtract: Range, newProcedureName: string, parameters: ALVariable[], returnTypeAnalyzer: ReturnTypeAnalyzer): Promise<string> {
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
            procedureCall += parameters[i].getNameOrEmpty();
        }
        procedureCall += ')';

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);

        let statementNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(rangeToExtract.end, FullSyntaxTreeNodeKind.getAllStatementKinds());
        if (statementNode) {
            let statementRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(statementNode.fullSpan));
            if (rangeToExtract.contains(statementRange)) { //if one or more statements are extracted then the semicolon would be missing
                procedureCall += ';';
            }
        }
        return procedureCall;
    }

    public addLineBreaksToProcedureCall(document: TextDocument, position: Position, textToInsert: string, isInterface: boolean) {
        if (!isInterface) {
            this.lineOfBodyStart = this.lineOfBodyStart ? this.lineOfBodyStart + 1 : undefined;
            textToInsert = "\r\n" + textToInsert;
        }
        textToInsert += "\r\n";
        return textToInsert;
    }
    public getLineOfBodyStart(): number | undefined {
        return this.lineOfBodyStart;
    }
}