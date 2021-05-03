import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { IALMethod } from "../Entities/IALMethod";
import { Err } from "../Utils/Err";
import { ALFullSyntaxTreeNode } from "./alFullSyntaxTreeNode";

export class ALMethodNode extends ALFullSyntaxTreeNode implements IALMethod {
    private node: ALFullSyntaxTreeNode;
    private memberAttributes!: string[];
    private constructor(node: ALFullSyntaxTreeNode) {
        super();
        this.node = node;
    }
    public static create(node: ALFullSyntaxTreeNode): ALMethodNode {
        if (node.kind != FullSyntaxTreeNodeKind.getMethodDeclaration())
            Err._throw('Only method nodes are valid.')
        let methodNode: ALMethodNode = new ALMethodNode(node)
        methodNode.memberAttributes = methodNode.getMemberAttributesAsString();
        return methodNode;
    }
    public getMemberAttributes(): string[] {
        return this.memberAttributes
    }
    private getMemberAttributesAsString(): string[] {
        let result: string[] = []
        let memberAttributes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(this.node, [FullSyntaxTreeNodeKind.getMemberAttribute()], false)
        for (let memberAttribute of memberAttributes) {
            result.push(memberAttribute.name!.trim())
        }
        return result;
    }
}