import { isUndefined } from "util";

export class ALVariable {
    public name: string;
    public type: string;
    public isLocal: boolean;
    public isVar: boolean;
    public procedure: string | undefined;
    constructor(name: string, procedure: string | undefined, isVar: boolean, type: string, modifyVarName: boolean) {
        this.name = name;
        if (modifyVarName) {
            this.name = this.addBrackets(this.name);
        }
        this.procedure = procedure;
        this.isLocal = !isUndefined(procedure);
        this.isVar = isVar;
        this.type = type;
    }
    public getVariableDeclarationString(): string {
        let declarationString = "";
        if (this.isVar) {
            declarationString = "var ";
        }
        declarationString += this.name;
        declarationString += ": ";
        declarationString += this.type;
        return declarationString;
    }
    private addBrackets(name: string): string {
        name = name.trim();
        name = name.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
        name = name.replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue');
        name = name.replace(/[^\w]/g, '');
        return name;
    }
}