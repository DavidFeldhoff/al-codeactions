import { isUndefined } from "util";
import { ALVariable } from './alVariable';
import { ALParameterHandler } from "./alParameterHandler";
import { ALObject } from "./alObject";

export class ALProcedure{
    name: string;
    private parameters: ALVariable[];
    private returnType?: string;
    public ObjectOfProcedure: ALObject;
    constructor(name: string, parameters: ALVariable[], returnValue: string | undefined, ALObject: ALObject){
        this.name = name;
        this.parameters = parameters;
        this.returnType = returnValue;
        this.ObjectOfProcedure = ALObject;
    }
    public getParametersAsString(): string{
        return ALParameterHandler.parseALVariableArrayToParameterDeclarationString(this.parameters);
    }
    public getReturnType(): string{
        if(isUndefined(this.returnType)){
            return "";
        }
        return this.returnType;
    }
}