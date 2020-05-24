import { AZSymbolKind } from "./azSymbolKind";
import { TextRange } from "./textRange";

export class AZSymbolInformation {
    id: number;
    idx: number;
    name: string;
    subtype: string | undefined;
    elementsubtype: string | undefined;
    fullName: string;
    kind: AZSymbolKind;
    icon: string;
    childSymbols: AZSymbolInformation[] | undefined;
    range: TextRange | undefined;
    selectionRange: TextRange | undefined;
    contentRange: TextRange | undefined;
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
}