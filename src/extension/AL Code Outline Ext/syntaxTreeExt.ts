import * as vscode from 'vscode';
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './fullSyntaxTreeNodeKind';

export class SyntaxTreeExt {
    private constructor() {

    }
    
    static getObjectTreeNode(syntaxTree: SyntaxTree, position: vscode.Position): ALFullSyntaxTreeNode | undefined {
        let kinds: string[] = [
            FullSyntaxTreeNodeKind.getTableObject(),
            FullSyntaxTreeNodeKind.getTableExtensionObject(),
            FullSyntaxTreeNodeKind.getPageObject(),
            FullSyntaxTreeNodeKind.getPageExtensionObject(),
            FullSyntaxTreeNodeKind.getCodeunitObject(),
            FullSyntaxTreeNodeKind.getReportObject(),
            FullSyntaxTreeNodeKind.getXmlPortObject(),
            FullSyntaxTreeNodeKind.getEnumType(),
            FullSyntaxTreeNodeKind.getEnumExtensionType(),
            FullSyntaxTreeNodeKind.getInterface()
        ];
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, kinds);
        return objectTreeNode;
    }

    static getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree: SyntaxTree, position: vscode.Position): ALFullSyntaxTreeNode | undefined {
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        return methodOrTriggerTreeNode;
    }

}