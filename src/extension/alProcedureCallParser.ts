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
        this.callingProcedureName = alSourceCodeHandler.getProcedureOrTriggerNameOfCurrentPosition(this.rangeOfProcedureCall.start.line);
        this.callingALObject = alSourceCodeHandler.getALObjectOfDocument();
    }

    public async getProcedure(): Promise<ALProcedure | undefined> {
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
        let isLocal: boolean;
        if (!isUndefined(execArray.groups["calledObj"])) {
            calledALObject = this.getCalledObject(execArray.groups["calledObj"]);
            isLocal = false;
            if (!this.canObjectContainProcedures(calledALObject)) {
                return;
            }
        } else {
            calledALObject = this.callingALObject;
            isLocal = true;
        }
        procedureNameToCreate = execArray.groups["calledProc"];
        parameters = await this.getParametersOfProcedureCall(execArray.groups["params"], procedureNameToCreate);

        return new ALProcedure(procedureNameToCreate, parameters, returnType, isLocal, calledALObject);
    }
    private canObjectContainProcedures(alObject: ALObject) {
        switch (alObject.type.toString().toLowerCase()) {
            case "enum":
                return false;
            default:
                return true;
        }
    }
    private async getParametersOfProcedureCall(parameterCallString: string, procedureNameToCreate: string): Promise<ALVariable[]> {
        let parameters = await ALParameterParser.parseParameterCallStringToALVariableArray(parameterCallString, this.callingProcedureName, this.document, this.rangeOfProcedureCall);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }

    private getReturnTypeOfProcedureCall(variableNameToBeAssigned: string): string {
        let returnType = this.alVariableHandler.getTypeOfVariable(variableNameToBeAssigned, this.callingProcedureName);
        if (isUndefined(returnType)) {
            //TODO: No Variable. Probably the Procedure Call is a parameter of another ProcedureCall
            throw new Error('Not supported yet.');
        }
        return returnType as string;
    }
    private getCalledObject(variableName: string): ALObject {
        let alVariable = this.alVariableHandler.getALVariableByName(variableName, this.callingProcedureName);
        if (isUndefined(alVariable)) {
            throw new Error('Unexpected error.');
        }
        let objectType = ALTypeHandler.mapVariableTypeToALObjectType(alVariable.type);
        return new ALObject(alVariable.subtype as string, objectType);
    }
}