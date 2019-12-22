import * as vscode from 'vscode';
import { isNull, isUndefined } from 'util';
import { ALProcedure } from './alProcedure';
import { ALVariableHandler } from './alVariableHandler';
import { ALVariable } from './alVariable';
import { ALParameterParser } from './alParameterParser';
import { ALSourceCodeHandler } from './alSourceCodeHandler';
import { RegExpCreator } from './regexpCreator';
import { ALObject } from './alObject';
import { ALTypeHandler } from './alTypeHandler';

export class ALProcedureCallParser {
    private document: vscode.TextDocument;
    private alVariableHandler: ALVariableHandler;
    private procedureCall: string;
    private rangeOfProcedureCall: vscode.Range;
    private callingProcedureName: string;
    private callingALObject: ALObject;

    constructor(document: vscode.TextDocument, rangeOfProcedureCall: vscode.Range) {
        this.rangeOfProcedureCall = rangeOfProcedureCall;
        this.document = document;
        this.procedureCall = document.getText(rangeOfProcedureCall);

        this.alVariableHandler = new ALVariableHandler(this.document);

        const alSourceCodeHandler = new ALSourceCodeHandler(this.document);
        this.callingProcedureName = alSourceCodeHandler.getProcedureNameOfCurrentPosition(this.rangeOfProcedureCall.start.line);
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
    private getParametersOfProcedureCall(parameterCallString: string, procedureNameToCreate: string): ALVariable[] {
        let parameters = ALParameterParser.parseParameterCallStringToALVariableArray(parameterCallString, this.callingProcedureName, this.document);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }

    private getReturnTypeOfProcedureCall(variableName: string): string {
        return this.alVariableHandler.getTypeOfVariable(variableName, this.callingProcedureName);
    }
    private getCalledObject(variableName: string): ALObject {
        let alVariable = this.alVariableHandler.getALVariableByName(variableName, this.callingProcedureName);
        let objectType = ALTypeHandler.mapVariableTypeToALObjectType(alVariable.type);   
        return new ALObject(alVariable.subtype as string, objectType);
    }
}