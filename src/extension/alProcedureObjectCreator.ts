import * as vscode from 'vscode';
import { isNull, isUndefined } from 'util';
import { ALProcedure } from './alProcedure';
import { ALVariableMgmt } from './alVariableMgmt';
import { ALVariable } from './alVariable';
import { ALParameterHandler } from './alParameterHandler';
import { ALSourceCodeHandler } from './alSourceCodeHandler';
import { RegExpCreator } from './regexpCreator';
import { ALObject } from './alObject';

export class ALProcedureObjectCreator {
    document: vscode.TextDocument;
    alVariableMgmt: ALVariableMgmt;
    procedureCall: string;
    procedureCallRange: vscode.Range;
    callingProcedureName: string;
    callingALObject: ALObject;

    constructor(document: vscode.TextDocument, procedureCallRange: vscode.Range) {
        this.procedureCallRange = procedureCallRange;
        this.document = document;
        this.procedureCall = document.getText(procedureCallRange);

        this.alVariableMgmt = new ALVariableMgmt(this.document);

        const alSourceCodeHandler = new ALSourceCodeHandler(this.document);
        this.callingProcedureName = alSourceCodeHandler.getProcedureNameOfCurrentPosition(this.procedureCallRange.start.line);
        this.callingALObject = alSourceCodeHandler.getALObjectOfDocument();
    }

    public getProcedure(): ALProcedure | undefined {
        let procedureNameToCreate: string;
        let returnType: string | undefined;
        let parameters: ALVariable[];
        let calledALObject: ALObject;

        let execArray = RegExpCreator.matchWholeProcedureCall.exec(this.procedureCall);
        if (isNull(execArray) || isUndefined(execArray.groups)) {
            return;
        }
        if (!isUndefined(execArray.groups["returnVar"])) {
            returnType = this.getReturnTypeOfProcedureCall(execArray.groups["returnVar"]);
        }
        if (!isUndefined(execArray.groups["calledObj"])) {
            calledALObject = this.getCalledObject(execArray.groups["calledObj"]);
        } else {
            calledALObject = this.callingALObject;
        }
        procedureNameToCreate = execArray.groups["calledProc"];
        parameters = this.getParametersOfProcedureCall(execArray.groups["params"], procedureNameToCreate);

        return new ALProcedure(procedureNameToCreate, parameters, returnType, calledALObject);
    }
    getParametersOfProcedureCall(parameterCallString: string, procedureNameToCreate: string): ALVariable[] {
        let parameters = ALParameterHandler.parseParameterCallStringToALVariableArray(parameterCallString, this.callingProcedureName, this.document);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }

    private getReturnTypeOfProcedureCall(variableName: string): string {
        return this.alVariableMgmt.getTypeOfVariable(variableName, this.callingProcedureName);
    }
    private getCalledObject(variableName: string): ALObject {
        let alVariable = this.alVariableMgmt.getALVariableByName(variableName, this.callingProcedureName);
        let objectType = ALSourceCodeHandler.mapVariableTypeToALObjectType(alVariable.type);   
        return new ALObject(alVariable.subtype as string, objectType);
    }

    public static createProcedureDefinition(procedure: ALProcedure): string {
        let returnType = procedure.getReturnType();
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
}