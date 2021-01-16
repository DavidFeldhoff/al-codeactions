import * as vscode from 'vscode';
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { ALObject } from '../Entities/alObject';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { DocumentUtils } from '../Utils/documentUtils';
import { Err } from '../Utils/Err';

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
            let objectId: number = this.getObjectId(document, objectTreeNode);
            let objectName: string = this.getName(document, objectTreeNode);
            return new ALObject(objectName, objectType, objectId, document.uri);
        }
        Err._throw('That\'s not an Object Tree Node.');
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
    private static getObjectId(document: vscode.TextDocument, objectTreeNode: ALFullSyntaxTreeNode): number {
        let objectIdTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getObjectId(), false);
        if (objectIdTreeNode && objectIdTreeNode.fullSpan) {
            let objectIdString: string = document.getText(TextRangeExt.createVSCodeRange(objectIdTreeNode.fullSpan));
            return +objectIdString;
        }
        return 0;
    }
    private static getName(document: vscode.TextDocument, objectTreeNode: ALFullSyntaxTreeNode): string {
        let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
        if (identifierTreeNode && identifierTreeNode.fullSpan) {
            return document.getText(DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan)));
        }
        return '';
    }
}