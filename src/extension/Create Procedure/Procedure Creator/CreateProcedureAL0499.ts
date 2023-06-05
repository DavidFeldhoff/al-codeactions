import { SyntaxTreeExt } from '../../AL Code Outline Ext/syntaxTreeExt';
import { ALFullSyntaxTreeNode } from '../../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../../AL Code Outline/syntaxTree';
import { DocumentUtils } from '../../Utils/documentUtils';
import { ALObject } from '../../Entities/alObject';
import { ALVariable } from '../../Entities/alVariable';
import { ALObjectParser } from '../../Entity Parser/alObjectParser';
import { ICreateProcedure } from './ICreateProcedure';
import { AccessModifier } from '../../Entities/accessModifier';
import { Err } from '../../Utils/Err';
import { Diagnostic, TextDocument } from 'vscode';

export class CreateProcedureAL0499 implements ICreateProcedure {
    syntaxTree: SyntaxTree | undefined;
    document: TextDocument;
    diagnostic: Diagnostic;
    procedureName: string;
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
        this.procedureName = DocumentUtils.getProcedureNameOfDiagnosticMessage(diagnostic.message);
    }
    async initialize() {
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
    }
    getProcedureName(): string {
        return this.procedureName;
    }
    getMemberAttributes(): string[] {
        return [];
    }
    getBody(): string | undefined {
        return undefined;
    }
    async getAccessModifier(): Promise<AccessModifier> {
        return AccessModifier.public
    }
    async getVariables(): Promise<ALVariable[]> {
        return [];
    }
    async getParameters(): Promise<ALVariable[]> {
        return [];
    }
    async getReturnType(): Promise<string | undefined> {
        return undefined;
    }
    async getObject(): Promise<ALObject> {
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(this.syntaxTree as SyntaxTree, this.diagnostic.range.start);
        if (!objectTreeNode)
            Err._throw('Object Tree node has to be found.');

        return ALObjectParser.parseObjectTreeNodeToALObject(this.document, objectTreeNode);
    }
    getJumpToCreatedProcedure(): boolean {
        return true;
    }
    containsSnippet(): boolean {
        Err._throw("Method not implemented.");
    }
    async isReturnTypeRequired(): Promise<boolean> {
        return false;
    }
}