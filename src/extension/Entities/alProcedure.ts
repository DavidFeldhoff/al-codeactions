import { isUndefined } from "util";
import { ALVariable } from './alVariable';
import { ALParameterParser } from "../Entity Parser/alParameterParser";
import { ALObject } from "./alObject";

export class ALProcedure {
    public name: string;
    public parameters: ALVariable[];
    public variables: ALVariable[];
    public returnVariableName?: string;
    public returnType?: string;
    public isLocal: boolean;
    private body: string | undefined;
    public ObjectOfProcedure: ALObject;
    constructor(name: string, parameters: ALVariable[], variables: ALVariable[], returnValue: string | undefined, isLocal: boolean, ALObject: ALObject) {
        this.name = name;
        this.parameters = parameters;
        this.variables = variables;
        this.returnType = returnValue;
        this.isLocal = isLocal;
        this.ObjectOfProcedure = ALObject;
    }
    public getParametersAsString(): string {
        return ALParameterParser.parseALVariableArrayToParameterDeclarationString(this.parameters);
    }
    public getReturnTypeAsString(): string {
        if (isUndefined(this.returnType)) {
            return "";
        }
        return this.returnType;
    }
    public setReturnVariableName(variableName: string) {
        this.returnVariableName = variableName;
    }
    public getReturnVariableName(): string {
        return this.returnVariableName ? ' ' + this.returnVariableName : '';
    }
    public setBody(body: string) {
        this.body = body;
    }
    public getBody(): string {
        if (this.body) {
            return this.body;
        } else {
            return "Error('Procedure not implemented.');";
        }
    }
}