import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from './fullSyntaxTreeNodeKind';
import { Position } from 'vscode';

export class SyntaxTreeExt {
    private constructor() {

    }
    
    static getObjectTreeNode(syntaxTree: SyntaxTree, position: Position): ALFullSyntaxTreeNode | undefined {
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, FullSyntaxTreeNodeKind.getAllObjectKinds());
        return objectTreeNode;
    }

    static getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree: SyntaxTree, position: Position): ALFullSyntaxTreeNode | undefined {
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        return methodOrTriggerTreeNode;
    }

}