import { Location, Range, Uri } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { DocumentUtils } from '../Utils/documentUtils';
import { WorkspaceUtils } from '../Utils/workspaceUtils';
import { Document } from './document';

export class ALObject {
    public name: string;
    public type: string;
    public id?: number;
    public documentUri?: Uri;
    constructor(name: string, type: string);
    constructor(name: string, type: string, id: number, documentUri: Uri);
    constructor(...args: any[]) {
        this.name = args[0];
        this.type = args[1];
        if (args.length > 2) {
            this.id = args[2];
            this.documentUri = args[3];
        }
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

    public async getEventSubscribers(filterOnEventName?: string[], filterOnFieldEvent?: string): Promise<Location[]> {
        let locations: { uri: Uri, methodName: string }[] = await WorkspaceUtils.getEventSubscribers(this.name, filterOnEventName, filterOnFieldEvent);
        let validEventSubscribers: Location[] = [];
        for (const location of locations) {
            let doc: Document = await Document.load(location.uri)
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(doc.uri.fsPath, doc.fileContent)
            let newEventNodes: ALFullSyntaxTreeNode[] = await this.getRelatedSyntaxTreeNodes(syntaxTree, location.methodName);
            for (const newEventNode of newEventNodes)
                validEventSubscribers.push(new Location(location.uri, DocumentUtils.trimRange2(doc.fileLines, TextRangeExt.createVSCodeRange(newEventNode.fullSpan))));
        }
        return validEventSubscribers;
    }
    public async getTriggers(filterOnTriggers?: string[], filterOnField?: string): Promise<Location[]> {
        let document: Document = await Document.load(this.documentUri!)
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(document.uri.fsPath, document.fileContent);
        let triggerTreeNodes: ALFullSyntaxTreeNode[] = []
        if (filterOnField) {
            let fieldModifications: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getFieldModification())
            let fieldModification: ALFullSyntaxTreeNode | undefined = fieldModifications.find((fieldMod) => fieldMod.name && fieldMod.name.removeQuotes().toLowerCase() == filterOnField.removeQuotes().toLowerCase())
            if (!fieldModification) return []
            ALFullSyntaxTreeNodeExt.collectChildNodes(fieldModification, FullSyntaxTreeNodeKind.getTriggerDeclaration(), false, triggerTreeNodes)
        } else
            triggerTreeNodes = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTriggerDeclaration());
        let triggerLocations: Location[] = []
        for (let n = 0; n < triggerTreeNodes.length; n++) {
            let identifierTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(triggerTreeNodes[n], FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
            let identifierRange: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
            let triggerName: string = DocumentUtils.getSubstringOfFileByRange(document.fileContent, identifierRange);

            if (!filterOnTriggers || filterOnTriggers.includes(triggerName.toLowerCase()))
                triggerLocations.push(new Location(document.uri, identifierRange))
        }
        return triggerLocations;
    }
    private async getRelatedSyntaxTreeNodes(syntaxTree: SyntaxTree, methodName: string): Promise<ALFullSyntaxTreeNode[]> {
        let methodNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getMethodDeclaration());
        let validNodes: ALFullSyntaxTreeNode[] = methodNodes.filter(methodNode => methodNode.name?.toLowerCase() == methodName.toLowerCase())
        for (let i = 0; i < validNodes.length; i++)
            validNodes[i] = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(validNodes[i], FullSyntaxTreeNodeKind.getIdentifierName(), false)!
        return validNodes;
    }
}