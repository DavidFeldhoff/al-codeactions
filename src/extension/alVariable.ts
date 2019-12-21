import { isUndefined } from "util";

export class ALVariable {
    name: string;
    // getTypeDefinition: string;
    type: string;
    subtype: string | undefined;
    dimensions: string | undefined;
    length: number | undefined;
    isLocal: boolean;
    isVar: boolean;
    isTemporary: boolean;
    procedure: string | undefined;
    constructor(name: string, isLocal: boolean, procedure: string | undefined, isVar: boolean, isTemporary: boolean, type: string, subtype?: string, length?: number, dimensions?: string) {
        this.name = name;
        this.isLocal = isLocal;
        this.procedure = procedure;
        this.isVar = isVar;
        this.isTemporary = isTemporary;
        this.type = type;
        this.subtype = subtype;
        this.length = length;
        this.dimensions = dimensions;
    }
    public getVariableDeclarationString(): string {
        let declarationString = "";
        if(this.isVar){
            declarationString = "var ";
        }
        declarationString += this.name;
        declarationString += ": ";
        declarationString += this.getTypeDefinition();
        if(this.isTemporary){
            declarationString += " temporary";
        }
        return declarationString;
    }
    public getTypeDefinition(): string{
        let typeDefinition = "";
        if(!isUndefined(this.dimensions)){
            typeDefinition = "array[" + this.dimensions + "] of ";
        }
        typeDefinition += this.type;
        if(!isUndefined(this.subtype)){
            typeDefinition += ' ' + this.subtype;
        }
        if(!isUndefined(this.length)){
            typeDefinition += '[' + this.length + ']';
        }
        return typeDefinition;
    }
}