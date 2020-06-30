import * as vscode from 'vscode';

export class ALObject {
    public name: string;
    public type: string;
    public id: number;
    public documentUri: vscode.Uri;
    constructor(name: string, type: string, id: number, documentUri: vscode.Uri) {
        this.name = name;
        this.type = type;
        this.id = id;
        this.documentUri = documentUri;
    }

    public getTypeString() {
        let returnString: string = '';
        switch (this.type.toLowerCase()) {
            case 'table':
            case 'tableextension':
                returnString += 'Record';
                break;
            case 'pageextension':
            case 'pagecustomization':
                returnString += 'Page';
                break;
            case 'enumextension':
                returnString += 'Enum';
                break;
            default:
                returnString += this.type;
        }
        if (this.name.includes(' ') && !this.name.includes('"')) {
            returnString += ' "' + this.name + '"';
        } else if (!this.name.includes(' ') && this.name.includes('"')) {
            let unquotedName: string = this.name.replace(/^"(.*)"$/, '$1');
            returnString += ' ' + unquotedName;
        } else {
            returnString += ' ' + this.name;
        }
        return returnString;
    }
}