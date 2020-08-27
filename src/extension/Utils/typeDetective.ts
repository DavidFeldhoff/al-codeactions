import * as vscode from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { OwnConsole } from '../console';
import { DocumentUtils } from './documentUtils';

export class TypeDetective {    
    private document: vscode.TextDocument;
    // private range: vscode.Range;
    private treeNode: ALFullSyntaxTreeNode;
    private type: string | undefined;
    private name: string | undefined;
    private isVar: boolean | undefined;
    private isTemporary: boolean | undefined;
    private hoverMessageFirstLine: string | undefined;
    constructor(document: vscode.TextDocument, treeNode: ALFullSyntaxTreeNode) {
        this.document = document;
        this.treeNode = treeNode;
    }
    public getType(): string {
        return this.type ? this.type : '';
    }
    public getName(): string {
        return this.name ? this.name : '';
    }
    public getIsVar(): boolean {
        return this.isVar ? this.isVar : false;
    }
    public getIsTemporary(): boolean {
        return this.isTemporary ? this.isTemporary : false;
    }
    public getHoverMessageFirstLine(): string | undefined {
        return this.hoverMessageFirstLine;
    }

    public async analyzeTypeOfTreeNode() {
        switch (this.treeNode.kind) {
            case FullSyntaxTreeNodeKind.getIdentifierName():
                await this.analyzeTypeOfIdentifierTreeNode(this.treeNode, this.document);
                break;
            case FullSyntaxTreeNodeKind.getUnaryPlusExpression():
            case FullSyntaxTreeNodeKind.getUnaryMinusExpression():
            case FullSyntaxTreeNodeKind.getUnaryNotExpression():
                if (this.treeNode.childNodes) {
                    let typeDetective: TypeDetective = new TypeDetective(this.document, this.treeNode.childNodes[0]);
                    await typeDetective.analyzeTypeOfTreeNode();
                    this.name = typeDetective.getName();
                    this.type = typeDetective.getType();
                }
                break;
            case FullSyntaxTreeNodeKind.getLiteralExpression():
                this.getTypeOfLiteralExpressionTreeNode(this.treeNode);
                break;
            case FullSyntaxTreeNodeKind.getInvocationExpression():
                if (this.treeNode.childNodes) {
                    let childNode: ALFullSyntaxTreeNode = this.treeNode.childNodes[0];
                    let typeDetective = new TypeDetective(this.document, childNode);
                    await typeDetective.analyzeTypeOfTreeNode();
                    this.name = typeDetective.getName();
                    this.type = typeDetective.getType();
                }
                break;
            case FullSyntaxTreeNodeKind.getMemberAccessExpression():
                if (this.treeNode.childNodes) {
                    let identifierTreeNode: ALFullSyntaxTreeNode = this.treeNode.childNodes[1];
                    await this.analyzeTypeOfIdentifierTreeNode(identifierTreeNode, this.document);
                }
                break;
            case FullSyntaxTreeNodeKind.getParenthesizedExpression():
            case FullSyntaxTreeNodeKind.getOptionAccessExpression():
                if (this.treeNode.childNodes) {
                    let childNode: ALFullSyntaxTreeNode = this.treeNode.childNodes[0];
                    let typeDetective: TypeDetective = new TypeDetective(this.document, childNode);
                    await typeDetective.analyzeTypeOfTreeNode();
                    this.name = typeDetective.getName();
                    this.type = typeDetective.getType();
                }
                break;
            case FullSyntaxTreeNodeKind.getAddExpression():
            case FullSyntaxTreeNodeKind.getSubtractExpression():
            case FullSyntaxTreeNodeKind.getMultiplyExpression():
            case FullSyntaxTreeNodeKind.getDivideExpression():
                this.name = 'arg';
                this.type = 'Decimal';
                break;
            case FullSyntaxTreeNodeKind.getLogicalAndExpression():
            case FullSyntaxTreeNodeKind.getLogicalOrExpression():
            case FullSyntaxTreeNodeKind.getUnaryNotExpression():
            case FullSyntaxTreeNodeKind.getLessThanExpression():
            case FullSyntaxTreeNodeKind.getLessThanOrEqualExpression():
            case FullSyntaxTreeNodeKind.getGreaterThanOrEqualExpression():
            case FullSyntaxTreeNodeKind.getGreaterThanExpression():
            case FullSyntaxTreeNodeKind.getEqualsExpression():
            case FullSyntaxTreeNodeKind.getNotEqualsExpression():
                this.name = 'arg';
                this.type = 'Boolean';
                break;
        }
        if (!this.name || !this.type) {
            this.name = 'arg';
            this.type = 'Variant';
        }
    }
    private getTypeOfLiteralExpressionTreeNode(treeNode: ALFullSyntaxTreeNode): boolean {
        if (treeNode && treeNode.childNodes && treeNode.childNodes[0].kind) {
            switch (treeNode.childNodes[0].kind) {
                case FullSyntaxTreeNodeKind.getBooleanLiteralValue():
                    this.name = 'arg';
                    this.type = 'Boolean';
                    return true;
                case FullSyntaxTreeNodeKind.getStringLiteralValue():
                    this.name = 'arg';
                    this.type = 'Text';
                    return true;
                case FullSyntaxTreeNodeKind.getInt32SignedLiteralValue():
                    this.name = 'arg';
                    this.type = 'Integer';
                    return true;
                case FullSyntaxTreeNodeKind.getDecimalSignedLiteralValue():
                    this.name = 'arg';
                    this.type = 'Decimal';
                    return true;
            }
        }
        return false;
    }
    private async analyzeTypeOfIdentifierTreeNode(identifierTreeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument): Promise<boolean> {
        if (identifierTreeNode.kind !== FullSyntaxTreeNodeKind.getIdentifierName()) {
            throw new Error('This is not an identifier');
        }
        let range: vscode.Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
        let position = range.start;
        if (identifierTreeNode && identifierTreeNode.kind && identifierTreeNode.kind === FullSyntaxTreeNodeKind.getIdentifierName()) {
            this.name = identifierTreeNode.identifier;

            let hovers: vscode.Hover[] | undefined = await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, position);
            if (hovers && hovers.length > 0) {
                let hoverMessage: string = hovers[0].contents.values().next().value.value;
                let hoverMessageLines: string[] = hoverMessage.split('\r\n');
                let startIndex = hoverMessageLines.indexOf('```al');
                if (startIndex >= 0) {
                    this.hoverMessageFirstLine = hoverMessageLines[startIndex + 1];
                    if (this.hoverMessageFirstLine.includes(':')) {
                        this.type = this.hoverMessageFirstLine.substr(this.hoverMessageFirstLine.lastIndexOf(':') + 1).trim();
                        this.type = this.fixHoverMessage(this.type);

                        this.checkIsVar(this.hoverMessageFirstLine);
                        await this.checkIsTemporary(this.hoverMessageFirstLine, document, position);
                        if (this.isTemporary) {
                            this.type += " temporary";
                        }
                        return true;
                    } else if (this.hoverMessageFirstLine.startsWith('Enum')) {
                        this.type = this.hoverMessageFirstLine;
                    }
                }
                OwnConsole.ownConsole.appendLine('Unable to get type of hoverMessage:\r\n' + hoverMessage);
                return false;
            }
            OwnConsole.ownConsole.appendLine('Unable to get hover of text:\r\n' + document.getText(range));
            return false;
        } else {
            OwnConsole.ownConsole.appendLine('Unable to get type of range:\r\n' + document.getText(range));
            return false;
        }
    }
    private fixHoverMessage(type: string): string {
        if (type === 'Label') {
            type = 'Text';
        }
        if (type.trim().startsWith('TestPage')) {
            let testpageType = type.trim().substr('TestPage'.length).trim();
            if (testpageType.includes(' ') && !testpageType.startsWith('"')) {
                type = 'TestPage "' + type.substr('TestPage'.length).trim() + '"';
            }
        }
        return type;
    }

    private checkIsVar(hoverMessageFirstLine: string) {
        let indexOfIdentifier: number = hoverMessageFirstLine.indexOf(this.name as string);
        if (indexOfIdentifier >= 0) {
            this.isVar = hoverMessageFirstLine.substring(0, indexOfIdentifier).trimRight().endsWith(' var');
        }
    }

    private async checkIsTemporary(hoverMessageFirstLine: string, document: vscode.TextDocument, position: vscode.Position) {
        let isVarOrParameter: boolean = hoverMessageFirstLine.startsWith('(local)') || hoverMessageFirstLine.startsWith('(global)') || hoverMessageFirstLine.startsWith('(parameter)');
        if (isVarOrParameter) {
            let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, position);
            if (locations && locations.length > 0) {
                let positionOfVariableDeclaration: vscode.Position = locations[0].range.start;
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
                let declarationTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(positionOfVariableDeclaration, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableListDeclaration(), FullSyntaxTreeNodeKind.getParameter()]);
                if (declarationTreeNode && declarationTreeNode.kind) {
                    switch (declarationTreeNode.kind) {
                        case FullSyntaxTreeNodeKind.getParameter():
                            let rangeOfDeclaration: vscode.Range = TextRangeExt.createVSCodeRange(declarationTreeNode.fullSpan);
                            this.isTemporary = document.getText(rangeOfDeclaration).trim().toLowerCase().endsWith('temporary');
                            break;
                        case FullSyntaxTreeNodeKind.getVariableDeclaration():
                        case FullSyntaxTreeNodeKind.getVariableListDeclaration():
                            if (declarationTreeNode.childNodes) {
                                let rangeOfTypeDeclaration: vscode.Range = TextRangeExt.createVSCodeRange(declarationTreeNode.childNodes[declarationTreeNode.childNodes.length - 1].fullSpan);
                                this.isTemporary = document.getText(rangeOfTypeDeclaration).trim().toLowerCase().endsWith('temporary');
                            }
                            break;
                    }
                }

            }
        }
    }
    public static async findReturnTypeOfInvocationAtPosition(document: vscode.TextDocument, position: vscode.Position): Promise<string | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        return await this.findReturnTypeOfTreeNode(document, invocationExpressionTreeNode);
    }
    public static async findReturnTypeOfTreeNode(document: vscode.TextDocument, treeNode: ALFullSyntaxTreeNode): Promise<string | undefined> {
        while (treeNode.parentNode && treeNode.parentNode.kind === FullSyntaxTreeNodeKind.getParenthesizedExpression()) {
            treeNode = treeNode.parentNode;
        }
        if (treeNode.parentNode && treeNode.parentNode.kind && treeNode.parentNode.childNodes) {
            switch (treeNode.parentNode.kind) {
                case FullSyntaxTreeNodeKind.getArgumentList():
                    let returnType: string | undefined = await this.getReturnTypeIfInArgumentList(treeNode, document, treeNode.parentNode);
                    if (returnType) {
                        return returnType;
                    }
                    break;
                case FullSyntaxTreeNodeKind.getExitStatement():
                    let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
                    let rangeOfExitStatement: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(treeNode.parentNode.fullSpan));
                    let methodOrTriggerNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(rangeOfExitStatement.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
                    if (methodOrTriggerNode) {
                        let identifierNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
                        if (identifierNode) {
                            let typeDetective: TypeDetective = new TypeDetective(document, identifierNode);
                            await typeDetective.analyzeTypeOfTreeNode();
                            return typeDetective.getType();
                        }
                    }
                    break;
                case FullSyntaxTreeNodeKind.getUnaryMinusExpression():
                case FullSyntaxTreeNodeKind.getUnaryPlusExpression():
                    return 'Decimal';
                case FullSyntaxTreeNodeKind.getIfStatement():
                case FullSyntaxTreeNodeKind.getLogicalAndExpression():
                case FullSyntaxTreeNodeKind.getLogicalOrExpression():
                case FullSyntaxTreeNodeKind.getUnaryNotExpression():
                case FullSyntaxTreeNodeKind.getInListExpression():
                    return 'Boolean';
                case FullSyntaxTreeNodeKind.getArrayIndexExpression():
                    return 'Integer';
                case FullSyntaxTreeNodeKind.getAssignmentStatement():
                case FullSyntaxTreeNodeKind.getCompoundAssignmentStatement():
                case FullSyntaxTreeNodeKind.getLessThanExpression():
                case FullSyntaxTreeNodeKind.getLessThanOrEqualExpression():
                case FullSyntaxTreeNodeKind.getGreaterThanOrEqualExpression():
                case FullSyntaxTreeNodeKind.getGreaterThanExpression():
                case FullSyntaxTreeNodeKind.getEqualsExpression():
                case FullSyntaxTreeNodeKind.getNotEqualsExpression():
                case FullSyntaxTreeNodeKind.getAddExpression():
                case FullSyntaxTreeNodeKind.getSubtractExpression():
                case FullSyntaxTreeNodeKind.getMultiplyExpression():
                case FullSyntaxTreeNodeKind.getDivideExpression():
                    //If the parent node is one of these kinds, then it always has to be found the kind of the counterpart
                    let indexOfInvocationTreeNode: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(treeNode.parentNode, treeNode);
                    let indexOfOtherTreeNode: number = indexOfInvocationTreeNode[0] === 0 ? 1 : 0;
                    let otherTreeNode: ALFullSyntaxTreeNode = treeNode.parentNode.childNodes[indexOfOtherTreeNode];

                    let typeDetective2: TypeDetective = new TypeDetective(document, otherTreeNode);
                    await typeDetective2.analyzeTypeOfTreeNode();
                    return typeDetective2.getType();
            }
        }
        return undefined;
    }
    static async getReturnTypeIfInArgumentList(treeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument, parentNode: ALFullSyntaxTreeNode): Promise<string | undefined> {
        let argumentNo: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(parentNode, treeNode);
        let signatureHelp: vscode.SignatureHelp | undefined = await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider', document.uri, TextRangeExt.createVSCodeRange(treeNode.span).start, ',');
        if (signatureHelp) {
            let parameterName = signatureHelp.signatures[0].parameters[argumentNo[0]].label;
            let procedureDeclarationLine = signatureHelp.signatures[0].label;
            let parentInvocation: ALFullSyntaxTreeNode | undefined = parentNode.parentNode;
            if (parentInvocation && parentInvocation.childNodes) {
                let procedureName: string | undefined;
                switch (parentInvocation.childNodes[0].kind) {
                    case FullSyntaxTreeNodeKind.getMemberAccessExpression():
                        procedureName = parentInvocation.childNodes[0].name;
                        break;
                    case FullSyntaxTreeNodeKind.getIdentifierName():
                        procedureName = parentInvocation.childNodes[0].identifier;
                        break;
                }
                if (procedureName) {
                    let declarationLineWithoutProcedureName: string = procedureDeclarationLine.substring(procedureDeclarationLine.indexOf(procedureName) + procedureName.length);
                    let regExp: RegExp = new RegExp('(?:[(]|,\\s)' + parameterName + '\\s*:\\s*(?<type>[^,)]+)');
                    let matcher: RegExpMatchArray | null = declarationLineWithoutProcedureName.match(regExp);
                    if (matcher && matcher.groups) {
                        return matcher.groups['type'].trim();
                    }
                }
            }
        }
    }
}