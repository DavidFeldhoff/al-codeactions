import { TextDocument, Range, Hover, commands, Position, Location, SignatureHelp } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { OwnConsole } from '../console';
import { DocumentUtils } from './documentUtils';
import { Err } from './Err';

export class TypeDetective {
    private document: TextDocument;
    // private range: Range;
    private treeNode: ALFullSyntaxTreeNode;
    private type: string | undefined;
    private name: string | undefined;
    private canBeVar: boolean | undefined;
    private isVar: boolean | undefined;
    private isTemporary: boolean | undefined;
    private hoverMessageFirstLine: string | undefined;
    private defaultVariableName: string = 'arg';
    constructor(document: TextDocument, treeNode: ALFullSyntaxTreeNode) {
        this.document = document;
        this.treeNode = treeNode;
    }
    public getType(): string {
        return this.type ? this.type : '';
    }
    public getName(returnBlankIfDefaultVariableName: boolean = false): string {
        if (returnBlankIfDefaultVariableName && this.name == this.defaultVariableName)
            return '';
        return this.name ? this.name : '';
    }
    public getIsVar(): boolean {
        return this.isVar ? this.isVar : false;
    }
    public getCanBeVar(): boolean {
        return this.canBeVar ? this.canBeVar : false
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
                    if (this.name.toLowerCase() == 'fieldcaption' && this.treeNode.childNodes.length > 1 && this.treeNode.childNodes[1].kind == FullSyntaxTreeNodeKind.getArgumentList())
                        this.name = this.name + this.document.getText(TextRangeExt.createVSCodeRange(this.treeNode.childNodes[1].fullSpan));
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
                    if (childNode.kind == FullSyntaxTreeNodeKind.getIdentifierName() && childNode.identifier && this.getValidOptionAccessIdentifiers().includes(childNode.identifier.toLowerCase())) {
                        // Database::Item
                        this.name = this.OptionAccessToType(childNode.identifier) + 'Id';
                        this.type = 'Integer';
                    } else {
                        // Enum::MyEnum::Value
                        if (this.treeNode.parentNode?.kind == FullSyntaxTreeNodeKind.getOptionAccessExpression() && this.treeNode.childNodes[0].identifier && this.treeNode.childNodes[0].identifier.toLowerCase() == 'enum')
                            childNode = this.treeNode.childNodes[1];
                        let typeDetective: TypeDetective = new TypeDetective(this.document, childNode);
                        await typeDetective.analyzeTypeOfTreeNode();
                        this.name = typeDetective.getName();
                        this.type = typeDetective.getType();
                    }
                }
                break;
            case FullSyntaxTreeNodeKind.getAddExpression():
                if (this.treeNode.childNodes) {
                    let childNode: ALFullSyntaxTreeNode = this.treeNode.childNodes[0];
                    let typeDetective: TypeDetective = new TypeDetective(this.document, childNode);
                    await typeDetective.analyzeTypeOfTreeNode();
                    this.name = typeDetective.getName();
                    this.type = typeDetective.getType();
                }
                break;
            case FullSyntaxTreeNodeKind.getSubtractExpression():
            case FullSyntaxTreeNodeKind.getMultiplyExpression():
            case FullSyntaxTreeNodeKind.getDivideExpression():
                this.name = this.defaultVariableName;
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
                this.name = this.defaultVariableName;
                this.type = 'Boolean';
                break;
        }
        if (!this.name || !this.type) {
            this.name = this.defaultVariableName;
            this.type = 'Variant';
        }
    }
    private getTypeOfLiteralExpressionTreeNode(treeNode: ALFullSyntaxTreeNode): boolean {
        if (treeNode && treeNode.childNodes && treeNode.childNodes[0].kind) {
            switch (treeNode.childNodes[0].kind) {
                case FullSyntaxTreeNodeKind.getBooleanLiteralValue():
                    this.name = this.defaultVariableName;
                    this.type = 'Boolean';
                    return true;
                case FullSyntaxTreeNodeKind.getStringLiteralValue():
                    this.name = this.defaultVariableName;
                    this.type = 'Text';
                    return true;
                case FullSyntaxTreeNodeKind.getInt32SignedLiteralValue():
                    this.name = this.defaultVariableName;
                    this.type = 'Integer';
                    return true;
                case FullSyntaxTreeNodeKind.getDecimalSignedLiteralValue():
                    this.name = this.defaultVariableName;
                    this.type = 'Decimal';
                    return true;
            }
        }
        return false;
    }
    private async analyzeTypeOfIdentifierTreeNode(identifierTreeNode: ALFullSyntaxTreeNode, document: TextDocument): Promise<boolean> {
        if (identifierTreeNode.kind !== FullSyntaxTreeNodeKind.getIdentifierName()) {
            Err._throw('This is not an identifier');
        }
        let range: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
        let position = range.start;
        if (identifierTreeNode && identifierTreeNode.kind && identifierTreeNode.kind === FullSyntaxTreeNodeKind.getIdentifierName()) {
            this.name = identifierTreeNode.identifier;

            let hovers: Hover[] | undefined = await commands.executeCommand('vscode.executeHoverProvider', document.uri, position);
            if (hovers && hovers.length > 0) {
                let allHoverMessages: string[] = [];
                for (const hover of hovers) {
                    let hoverMessage: string = hover.contents.values().next().value.value;
                    allHoverMessages.push(hoverMessage);
                    let hoverMessageLines: string[] = hoverMessage.split('\r\n');
                    let startIndex = hoverMessageLines.indexOf('```al');
                    if (startIndex >= 0) {
                        this.hoverMessageFirstLine = hoverMessageLines[startIndex + 1];
                        if (this.hoverMessageFirstLine.includes(':')) {
                            this.type = this.hoverMessageFirstLine.substr(this.hoverMessageFirstLine.lastIndexOf(':') + 1).trim();
                            this.type = this.fixHoverMessage(this.type);
                            this.canBeVar = true;

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
                }
                OwnConsole.ownConsole.appendLine('Unable to get type of hoverMessage:\r\n' + allHoverMessages.join('\r\n'));
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

    private async checkIsTemporary(hoverMessageFirstLine: string, document: TextDocument, position: Position) {
        let isVarOrParameter: boolean = hoverMessageFirstLine.startsWith('(local)') || hoverMessageFirstLine.startsWith('(global)') || hoverMessageFirstLine.startsWith('(parameter)');
        if (isVarOrParameter) {
            let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, position);
            if (locations && locations.length > 0) {
                let positionOfVariableDeclaration: Position = locations[0].range.start;
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
                let declarationTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(positionOfVariableDeclaration, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableListDeclaration(), FullSyntaxTreeNodeKind.getParameter()]);
                if (declarationTreeNode && declarationTreeNode.kind) {
                    switch (declarationTreeNode.kind) {
                        case FullSyntaxTreeNodeKind.getParameter():
                            let rangeOfDeclaration: Range = TextRangeExt.createVSCodeRange(declarationTreeNode.fullSpan);
                            this.isTemporary = document.getText(rangeOfDeclaration).trim().toLowerCase().endsWith('temporary');
                            break;
                        case FullSyntaxTreeNodeKind.getVariableDeclaration():
                        case FullSyntaxTreeNodeKind.getVariableListDeclaration():
                            if (declarationTreeNode.childNodes) {
                                let rangeOfTypeDeclaration: Range = TextRangeExt.createVSCodeRange(declarationTreeNode.childNodes[declarationTreeNode.childNodes.length - 1].fullSpan);
                                this.isTemporary = document.getText(rangeOfTypeDeclaration).trim().toLowerCase().endsWith('temporary');
                            }
                            break;
                    }
                }

            }
        }
    }
    public static async findReturnTypeOfInvocationAtPosition(document: TextDocument, position: Position): Promise<string | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let invocationExpressionTreeNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getInvocationExpression()]) as ALFullSyntaxTreeNode;
        return await this.findReturnTypeOfTreeNode(document, invocationExpressionTreeNode);
    }
    public static async findReturnTypeOfTreeNode(document: TextDocument, treeNode: ALFullSyntaxTreeNode): Promise<string | undefined> {
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
                    let rangeOfExitStatement: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(treeNode.parentNode.fullSpan));
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
                    if (treeNode.parentNode.childNodes[0] == treeNode)
                        return 'Boolean';
                    else
                        return undefined;
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
    static async getReturnTypeIfInArgumentList(treeNode: ALFullSyntaxTreeNode, document: TextDocument, parentNode: ALFullSyntaxTreeNode): Promise<string | undefined> {
        let argumentNo: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(parentNode, treeNode);
        let signatureHelp: SignatureHelp | undefined = await commands.executeCommand('vscode.executeSignatureHelpProvider', document.uri, TextRangeExt.createVSCodeRange(treeNode.span).start, ',');
        if (signatureHelp && signatureHelp.signatures[0].parameters.length > argumentNo[0]) {
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
                    if (procedureName.toLowerCase() == 'validate' && parentNode.childNodes!.length == 2 && argumentNo[0] == 1) {
                        let typeDetective: TypeDetective = new TypeDetective(document, parentNode.childNodes![0]);
                        await typeDetective.analyzeTypeOfTreeNode();
                        return typeDetective.getType();
                    }
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
    private OptionAccessToType(optionAccess: string): string {
        switch (optionAccess.toLowerCase()) {
            case 'database': return 'Table';
            case 'page': return 'Page';
            case 'codeunit': return 'Codeunit';
            case 'report': return 'Report';
            case 'query': return 'Query';
            case 'xmlport': return 'Xmlport';
            default: Err._throw('Expected a valid OptionAccessIdentifier.');
        }
    }
    private getValidOptionAccessIdentifiers(): string[] {
        return [
            'database',
            'page',
            'codeunit',
            'report',
            'query',
            'xmlport'
        ]
    }
}