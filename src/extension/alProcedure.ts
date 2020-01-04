import { isUndefined } from "util";
import { ALVariable } from './alVariable';
import { ALParameterParser } from "./alParameterParser";
import { ALObject } from "./alObject";

export class ALProcedure{
    public name: string;
    public parameters: ALVariable[];
    public returnType?: string;
    public ObjectOfProcedure: ALObject;
    constructor(name: string, parameters: ALVariable[], returnValue: string | undefined, ALObject: ALObject){
        this.name = name;
        this.parameters = parameters;
        this.returnType = returnValue;
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