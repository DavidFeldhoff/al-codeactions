import { isUndefined } from "util";
import { ALVariable } from './alVariable';
import { ALParameterParser } from "./alParameterParser";
import { ALObject } from "./alObject";

export class ALProcedure{
    public name: string;
    public parameters: ALVariable[];
    public variables: ALVariable[];
    public returnType?: string;
    public isLocal: boolean;
    public ObjectOfProcedure: ALObject;
    constructor(name: string, parameters: ALVariable[], variables: ALVariable[], returnValue: string | undefined, isLocal: boolean, ALObject: ALObject){
        this.name = name;
        this.parameters = parameters;
        this.variables = variables;
        this.returnType = returnValue;
        this.isLocal = isLocal;
        this.ObjectOfProcedure = ALObject;
    }
    public getParametersAsString(): string{
        return ALParameterParser.parseALVariableArrayToParameterDeclarationString(this.parameters);
    }
    public getReturnTypeAsString(): string{
        if(isUndefined(this.returnType)){
            return "";
        }
        return this.returnType;
    }
}