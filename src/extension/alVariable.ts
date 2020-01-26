import { isUndefined } from "util";

export class ALVariable {
    public name: string;
    public type: string;
    public isLocal: boolean;
    public isVar: boolean;
    public procedure: string | undefined;
    constructor(name: string, procedure: string | undefined, isVar: boolean, type: string) {
        this.name = name;
        this.procedure = procedure;
        this.isLocal = !isUndefined(procedure);
        this.isVar = isVar;
        this.type = type;
    }
    public getVariableDeclarationString(): string {
        let declarationString = "";
        if(this.isVar){
            declarationString = "var ";
        }
        declarationString += this.name;
        declarationString += ": ";
        declarationString += this.type;
        return declarationString;
    }
}