import * as vscode from 'vscode';
import { ALFullSyntaxTreeNode } from "./AL Code Outline/alFullSyntaxTreeNode";
import { ALObject } from './alObject';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';

export class ALObjectParser {
    private static objectKinds: string[] = [
        FullSyntaxTreeNodeKind.getTableObject(),
        FullSyntaxTreeNodeKind.getTableExtensionObject(),
        FullSyntaxTreeNodeKind.getPageObject(),
        FullSyntaxTreeNodeKind.getPageExtensionObject(),
        FullSyntaxTreeNodeKind.getPageCustomizationObject(),
        FullSyntaxTreeNodeKind.getReportObject(),
        FullSyntaxTreeNodeKind.getCodeunitObject(),
        FullSyntaxTreeNodeKind.getXmlPortObject(),
        FullSyntaxTreeNodeKind.getEnumType(),
        FullSyntaxTreeNodeKind.getEnumExtensionType(),
        FullSyntaxTreeNodeKind.getInterface()
    ];

    public static parseObjectTreeNodeToALObject(document: vscode.TextDocument, objectTreeNode: ALFullSyntaxTreeNode): ALObject {
        if (objectTreeNode.kind && this.objectKinds.includes(objectTreeNode.kind)) {
            let objectType: string = this.getType(objectTreeNode.kind);
            let objectId: number = this.getObjectId(objectTreeNode);
            let objectName: string = this.getName(objectTreeNode);
            return new ALObject(objectName, objectType, objectId, document.uri);
        }
        throw new Error('That\'s not an Object Tree Node.');
    }
    private static getType(kind: string): string {
        if (kind.endsWith('Value')) {
            return kind.substring(0, kind.length - 1 - 'Value'.length);
        }
        if (kind.endsWith('Object')) {
            return kind.substring(0, kind.length - 1 - 'Object'.length);
        }
        return kind;
    }
    private static getObjectId(objectTreeNode: ALFullSyntaxTreeNode): number {
        let objectIdTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getObjectId(), false);
        if (objectIdTreeNode && objectIdTreeNode.name) {
            let objectIdString: string = objectIdTreeNode.name;
            return +objectIdString;
        }
        return 0;
    }
    private static getName(objectTreeNode: ALFullSyntaxTreeNode): string {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (identifierTreeNode && identifierTreeNode.name) {
            return identifierTreeNode.name;
        }
        return '';
    }
}