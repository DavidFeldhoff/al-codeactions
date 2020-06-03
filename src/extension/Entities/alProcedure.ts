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
    public memberAttributes: string[];
    private jumpToCreatedPosition: boolean;
    private containsSnippet: boolean;
    constructor(name: string, parameters: ALVariable[], variables: ALVariable[], returnValue: string | undefined, isLocal: boolean, memberAttributes: string[], jumpToCreatedPosition: boolean, containsSnippet: boolean, ALObject: ALObject) {
        this.name = name;
        this.parameters = parameters;
        this.variables = variables;
        this.returnType = returnValue;
        this.isLocal = isLocal;
        this.memberAttributes = memberAttributes;
        this.jumpToCreatedPosition = jumpToCreatedPosition;
        this.containsSnippet = containsSnippet;
        this.ObjectOfProcedure = ALObject;
    }
    public getMemberAttributes(): string[] {
        return this.memberAttributes;
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
            return "Error('Procedure " + this.name + " not implemented.');";
        }
    }
    public getJumpToCreatedPosition(): boolean {
        return this.jumpToCreatedPosition;
    }
    public getContainsSnippet(): boolean {
        return this.containsSnippet;
    }
}