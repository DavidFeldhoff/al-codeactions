import { AZSymbolKind } from "./azSymbolKind";
import { TextRange } from "./textRange";

export class AZSymbolInformation {
    id : number;
    idx: number;
    name : string;
    subtype : string | undefined;
    elementsubtype : string | undefined;
    fullName : string;
    kind : AZSymbolKind;
    icon : string;
    childSymbols : AZSymbolInformation[] | undefined;
    //full symbol range from the begining to the end of symbol definition
    range: TextRange | undefined;
    //smaller symbol range, usual symbol name
    selectionRange : TextRange | undefined;
    contentRange: TextRange | undefined;
    containsDiagnostics: boolean | undefined;
    source: string | undefined;
    extends: string | undefined;
    parent: AZSymbolInformation | undefined;
    
    constructor() {
        this.id = 0;
        this.idx = -1;
        this.name = '';
        this.fullName = '';
        this.subtype = undefined;
        this.elementsubtype = undefined;
        this.icon = '';
        this.kind = AZSymbolKind.Undefined;
        this.childSymbols = undefined;
        this.range = undefined;
        this.selectionRange = undefined;
        this.contentRange = undefined;
        this.source = undefined;
        this.extends = undefined;
        this.parent = undefined;
    }

    public static fromAny(source : any) : AZSymbolInformation {
        let obj : AZSymbolInformation = new AZSymbolInformation();
        if (source.id)
            obj.id = source.id;
        if (source.name)
            obj.name = source.name;
        if (source.fullName)
            obj.fullName = source.fullName;
        if (source.kind)
            obj.kind = source.kind;        
        if (source.range)
            obj.range = TextRange.fromAny(source.range);
        if (source.selectionRange)
            obj.selectionRange = TextRange.fromAny(source.selectionRange);
        if (source.contentRange)
            obj.contentRange = TextRange.fromAny(source.contentRange);
        if (source.source)
            obj.source = source.source;
        if (source.extends)
            obj.extends = source.extends;
        if (source.subtype)
            obj.subtype = source.subtype;
        if (source.elementsubtype)
            obj.elementsubtype = source.elementsubtype;
        if (source.containsDiagnostics)
            obj.containsDiagnostics = source.containsDiagnostics;

        if (source.childSymbols)
            for (let i=0; i<source.childSymbols.length; i++)
                obj.addChildItem(AZSymbolInformation.fromAny(source.childSymbols[i]));
        return obj;
    }    

    public isALObject() : boolean {
        return ((this.kind == AZSymbolKind.TableObject) ||
            (this.kind == AZSymbolKind.CodeunitObject) ||
            (this.kind == AZSymbolKind.PageObject) ||
            (this.kind == AZSymbolKind.ReportObject) ||
            (this.kind == AZSymbolKind.QueryObject) ||
            (this.kind == AZSymbolKind.XmlPortObject) ||
            (this.kind == AZSymbolKind.TableExtensionObject) ||
            (this.kind == AZSymbolKind.PageExtensionObject) ||
            (this.kind == AZSymbolKind.ControlAddInObject) ||
            (this.kind == AZSymbolKind.EnumType) ||
            (this.kind == AZSymbolKind.EnumExtensionType) ||
            (this.kind == AZSymbolKind.DotNetPackage) ||
            (this.kind == AZSymbolKind.ProfileObject) ||
            (this.kind == AZSymbolKind.PageCustomizationObject) ||
            (this.kind == AZSymbolKind.Interface));
    }

    public collectObjectSymbols(outList : AZSymbolInformation[]) {
        if (this.isALObject())
            outList.push(this);
        else if (this.childSymbols)
            for (let i=0; i<this.childSymbols.length; i++)
                this.childSymbols[i].collectObjectSymbols(outList);
    }

    public addChildItem(childItem : AZSymbolInformation | undefined) {
        if (childItem) {
            if (!this.childSymbols)
                this.childSymbols = [];
            this.childSymbols.push(childItem);
        }
    }
}