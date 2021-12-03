import { Position, TextDocument } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALObject } from '../Entities/alObject';
import { Err } from '../Utils/Err';

export class ALObjectParser {
    public static parseObjectTreeNodeToALObject(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode): ALObject {
        if (objectTreeNode.kind && FullSyntaxTreeNodeKind.getAllObjectKinds().includes(objectTreeNode.kind)) {
            let objectType: string = this.getType(objectTreeNode.kind);
            let objectId: number = this.getObjectId(document, objectTreeNode);
            let objectName: string = this.getName(document, objectTreeNode);
            return new ALObject(objectName, objectType, objectId, document.uri);
        }
        Err._throw('That\'s not an Object Tree Node.');
    }
    public static async getBaseObjectName(document: TextDocument, position: Position): Promise<string | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(document.uri.fsPath, document.getText());
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, FullSyntaxTreeNodeKind.getAllObjectKinds());
        if (!objectTreeNode || !objectTreeNode.kind)
            return;
        let isExtension = [FullSyntaxTreeNodeKind.getTableExtensionObject(),
        FullSyntaxTreeNodeKind.getPageExtensionObject(),
        FullSyntaxTreeNodeKind.getPageCustomizationObject(),
        FullSyntaxTreeNodeKind.getEnumExtensionType()
        ].includes(objectTreeNode.kind)

        let kindToSearch: string = isExtension ? FullSyntaxTreeNodeKind.getObjectReference() : FullSyntaxTreeNodeKind.getIdentifierName()
        let identifierOfObject: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, kindToSearch, false);
        if (!identifierOfObject)
            return;
        let name: string = identifierOfObject.identifier!
        return name
    }
    public static async findTableFieldAndReturnFieldName(document: TextDocument, position: Position): Promise<string | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(document.uri.fsPath, document.getText());
        let fieldNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getField(), FullSyntaxTreeNodeKind.getFieldModification()])
        if (fieldNode)
            return ALFullSyntaxTreeNodeExt.getIdentifierValue(document, fieldNode, false)
    }
    private static getType(kind: string): string {
        if (kind.endsWith('Value')) {
            return kind.substring(0, kind.length - 'Value'.length);
        }
        if (kind.endsWith('Object')) {
            return kind.substring(0, kind.length - 'Object'.length);
        }
        return kind;
    }
    private static getObjectId(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode): number {
        let objectIdTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getObjectId(), false);
        if (objectIdTreeNode && objectIdTreeNode.fullSpan) {
            let objectIdString: string = document.getText(TextRangeExt.createVSCodeRange(objectIdTreeNode.fullSpan));
            return +objectIdString;
        }
        return 0;
    }
    private static getName(document: TextDocument, objectTreeNode: ALFullSyntaxTreeNode): string {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (identifierTreeNode && identifierTreeNode.identifier)
            return identifierTreeNode.identifier
        else
            return '';
    }

}