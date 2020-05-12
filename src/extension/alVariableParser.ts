import * as vscode from 'vscode';
import { ALVariable } from "./alVariable";
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { DocumentUtils } from './documentUtils';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from './AL Code Outline Ext/syntaxTreeExt';

export class ALVariableParser {
    
    public static async findAllVariablesInDocument(document: vscode.TextDocument): Promise<ALVariable[]> {
        let alCodeOutlineExtension = await ALCodeOutlineExtension.getInstance();
        let api = alCodeOutlineExtension.getAPI();
        let symbols = await api.symbolsService.loadDocumentSymbols(document.uri);
        let rootSymbol = symbols.rootSymbol.childSymbols[0];
        let variables: ALVariable[] = [];
        let variableSymbols: any[] = [];
        rootSymbol.collectChildSymbols(241, true, variableSymbols); //241 = Variable Declaration
        for (let i = 0; i < variableSymbols.length; i++) {
            let alVariable = ALVariableParser.parseVariableSymbolToALVariable(variableSymbols[i]);
            variables.push(alVariable);
        }
        let parameterSymbols: any[] = [];
        rootSymbol.collectChildSymbols(240, true, parameterSymbols); //240 = Paramter
        for (let i = 0; i < parameterSymbols.length; i++) {
            let alVariable = ALVariableParser.parseParameterSymbolToALVariable(parameterSymbols[i]);
            variables.push(alVariable);
        }
        return variables;
        //fullName = PreviewMode: Boolean, name = PreviewMode
        //method.fullName = Post(document), method.name = Post
        //parent.parent.kind == 236 == trigger, 238 = method
    }
    static parseVariableSymbolToALVariable(variableSymbol: any): ALVariable {
        let procedureOrTriggerName: string | undefined;
        if (ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(variableSymbol.parent.parent.kind)) {
            procedureOrTriggerName = variableSymbol.parent.parent.name;
        }
        return new ALVariable(variableSymbol.name, procedureOrTriggerName, false, variableSymbol.subtype);
    }
    static async parseVariableTreeNodeArrayToALVariableArray(document: vscode.TextDocument, variableTreeNodes: ALFullSyntaxTreeNode[]): Promise<ALVariable[]> {
        let alVariables: ALVariable[] = [];
        for(let i= 0; i < variableTreeNodes.length;i++){
            switch (variableTreeNodes[i].kind) {
                case FullSyntaxTreeNodeKind.getVariableDeclaration():
                    alVariables.push(await this.parseVariableDeclarationTreeNodeToALVariable(document, variableTreeNodes[i]));
                    break;
                case FullSyntaxTreeNodeKind.getVariableDeclarationName():
                    alVariables.push(await this.parseVariableDeclarationNameTreeNodeToALVariable(document, variableTreeNodes[i]));
                    break;
                default:
                    throw new Error('Variable should be one of the above kinds.');
            }
        }
        return alVariables;
    }
    static async parseVariableDeclarationTreeNodeToALVariable(document: vscode.TextDocument, variableDeclarationTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable> {
        if (!variableDeclarationTreeNode.kind || variableDeclarationTreeNode.kind !== FullSyntaxTreeNodeKind.getVariableDeclaration()) {
            throw new Error('That\'s not a variable declaration tree node.');
        }
        if (variableDeclarationTreeNode.childNodes) {
            let identifierTreeNode: ALFullSyntaxTreeNode = variableDeclarationTreeNode.childNodes[0];
            let rangeOfName: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = variableDeclarationTreeNode.childNodes[1];
            let rangeOfType: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            return new ALVariable(identifierName, methodOrTriggerTreeNode?.name, false, type);
        } else {
            throw new Error('Variable declaration has no child nodes.');
        }
    }
    static async parseVariableDeclarationNameTreeNodeToALVariable(document: vscode.TextDocument, declarationNameTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable> {
        if (!declarationNameTreeNode.kind || declarationNameTreeNode.kind !== FullSyntaxTreeNodeKind.getVariableDeclarationName()) {
            throw new Error('That\'s not a variable declaration name tree node.');
        }
        if (declarationNameTreeNode.parentNode && declarationNameTreeNode.parentNode.childNodes) {
            let rangeOfName: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(declarationNameTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = declarationNameTreeNode.parentNode.childNodes[declarationNameTreeNode.parentNode.childNodes.length - 1];
            let rangeOfType: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            return new ALVariable(identifierName, methodOrTriggerTreeNode?.name, false, type);
        } else {
            throw new Error('Variable declaration has no parent node.');
        }
    }
    static async parseReturnValueTreeNodeToALVariable(document: vscode.TextDocument, returnVariableTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable> {
        if (!returnVariableTreeNode.kind || returnVariableTreeNode.kind !== FullSyntaxTreeNodeKind.getReturnValue()) {
            throw new Error('That\'s not a return value tree node.');
        }
        if (returnVariableTreeNode.childNodes && returnVariableTreeNode.childNodes.length === 2) {
            let identifierTreeNode: ALFullSyntaxTreeNode = returnVariableTreeNode.childNodes[0];
            let rangeOfName: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = returnVariableTreeNode.childNodes[1];
            let rangeOfType: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            return new ALVariable(identifierName, methodOrTriggerTreeNode?.name, false, type);
        } else {
            throw new Error('Variable declaration has no child nodes.');
        }
    }
    static async parseVariableDeclarationToALVariable(document: vscode.TextDocument, variableDeclarationTreeNode: ALFullSyntaxTreeNode): Promise<ALVariable> {
        if (variableDeclarationTreeNode.name && variableDeclarationTreeNode.childNodes && variableDeclarationTreeNode.childNodes.length > 2) {
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            //get method
            let vscodeRange: vscode.Range = TextRangeExt.createVSCodeRange(variableDeclarationTreeNode.fullSpan);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(vscodeRange.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);

            //get type
            let rangeOfType: vscode.Range = TextRangeExt.createVSCodeRange(variableDeclarationTreeNode.childNodes[variableDeclarationTreeNode.childNodes.length - 1].fullSpan);
            let type: string = document.getText(rangeOfType);
            return new ALVariable(variableDeclarationTreeNode.name, methodOrTriggerTreeNode?.name, false, type);
        }
        throw new Error('Unable to parse variable');
    }
    static parseParameterSymbolToALVariable(parameterSymbol: any): ALVariable {
        let procedureOrTriggerName: string | undefined;
        let parameterDeclaration = parameterSymbol.fullName.trim();
        let isVar: boolean = false;
        switch (parameterSymbol.parent.parent.kind) {
            case 236:
            case 237:
            case 238:
            case 239:
            case 50001:
                procedureOrTriggerName = parameterSymbol.parent.parent.name;
                let declarationLine: string = parameterSymbol.parent.parent.fullName;
                if (declarationLine.includes('var ' + parameterDeclaration)) {
                    parameterDeclaration = 'var ' + parameterDeclaration;
                }
                isVar = true;
                break;
            default:
                procedureOrTriggerName = undefined;
                break;
        }
        let alVariable = new ALVariable(parameterSymbol.name, procedureOrTriggerName, isVar, parameterSymbol.subtype);
        // let alVariable = ALVariableParser.parseVariableDeclarationStringToVariable(parameterDeclaration, procedureOrTriggerName);
        return alVariable;
    }

    public static async parseFieldSymbolToALVariable(symbol: any, uri?: vscode.Uri): Promise<ALVariable> {
        if (!symbol.subtype) {
            if (ALCodeOutlineExtension.isSymbolKindProcedureOrTrigger(symbol.kind)) {
                let lastBracketPos = symbol.fullName.lastIndexOf(')');
                let colonPos = symbol.fullName.indexOf(':', lastBracketPos);
                if (colonPos > 0) {
                    symbol.subtype = symbol.fullName.substr(colonPos + 1).trim();
                }
                symbol.name = "arg";
            } else {
                if (ALCodeOutlineExtension.isSymbolKindTableField(symbol.kind) && symbol.fullName.trim().endsWith("Option") && uri) {
                    // expand range due to a cut off in the al code outline extension
                    let document: vscode.TextDocument = await vscode.workspace.openTextDocument(uri);
                    for (let i = symbol.range.start.line; i <= symbol.range.end.line; i++) {
                        let line = document.lineAt(i).text;
                        if (line.includes('OptionMembers')) {
                            let textOptionValues = line.substr(line.indexOf('OptionMembers'));
                            textOptionValues = textOptionValues.substr(textOptionValues.indexOf('=') + 1);
                            textOptionValues = textOptionValues.substr(0, textOptionValues.lastIndexOf(';')).trim();
                            symbol.fullName = symbol.fullName.trim() + ' ' + textOptionValues;
                            break;
                        }
                    }
                }
                symbol.subtype = this.getTypeOfVariableDeclaration(symbol.fullName);
            }
        }
        return new ALVariable(symbol.name, undefined, false, symbol.subtype);
    }

    public static async parseMemberAccessExpressionToALVariableUsingSymbols(document: vscode.TextDocument, variableCallRange: vscode.Range): Promise<ALVariable | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let memberAccessExpression: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(variableCallRange.start, [FullSyntaxTreeNodeKind.getMemberAccessExpression()]);
        if (memberAccessExpression && memberAccessExpression.childNodes && memberAccessExpression.childNodes.length === 2 && memberAccessExpression.childNodes[1].name) {
            let methodOrTriggerTreeNode = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, variableCallRange.start);
            let vscodeRange: vscode.Range = TextRangeExt.createVSCodeRange(memberAccessExpression.childNodes[1].fullSpan);
            let hovers: vscode.Hover[] | undefined = await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, vscodeRange.start);
            let hoverMessage: string = '';
            if (hovers) {
                for (let i = 0; i < hovers.length; i++) {
                    let markedStrings: IterableIterator<vscode.MarkedString> = hovers[i].contents.values();
                    let markedString: IteratorResult<vscode.MarkedString, any>;
                    do {
                        markedString = markedStrings.next();
                        if (markedString) {
                            hoverMessage += markedString.value;
                        }
                    } while (markedString);
                }
            }
            let hoverMessageFirstLine = hoverMessage.split('\r\n')[0];
            let type = hoverMessageFirstLine.substr(hoverMessageFirstLine.lastIndexOf(':') + 1).trim();
            // let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, vscodeRange.start);
            // if (locations && locations.length > 0) {
            //     let location = locations[0];
            //     let otherDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(location.uri);
            //     let otherSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(otherDocument);
            //     otherSyntaxTree.findTreeNode(location.range.start);
            //     let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(otherSyntaxTree, location.range.start);
            //     let paramterRange: vscode.Range = TextRangeExt.createVSCodeRange(parameter.range);
            //     if (paramterRange.contains(location.range)) {
            //         parametersNeeded.push(parameter);
            //         break;
            //     }
            // }
            return new ALVariable(memberAccessExpression.childNodes[1].name, methodOrTriggerTreeNode?.name, false, type);
        } else {
            return undefined;
        }
        // let variableCall: string = document.getText(variableCallRange);
        // //With VariableCall I mean 'Customer."No."' e.g.
        // if (variableCall.includes('.')) {
        //     let objectRange: vscode.Range | undefined = DocumentUtils.getNextWordRangeInsideLine(document, variableCallRange);
        //     if (!objectRange) {
        //         throw new Error('Unexpected Error in parseVariableCallToALVariableUsingSymbols with ' + document.getText(variableCallRange));
        //     }
        //     let childNameRange = DocumentUtils.getNextWordRangeInsideLine(document, variableCallRange, objectRange.end.translate(0, 1));
        //     if (!childNameRange) {
        //         throw new Error('Unexpected Error in parseVariableCallToALVariableUsingSymbols with ' + document.getText(variableCallRange));
        //     }
        //     const alSymbolHandler = new ALSymbolHandler();
        //     let searchedSymbol = await alSymbolHandler.findSymbol(document, childNameRange?.start, document.getText(childNameRange));
        //     if (!isUndefined(searchedSymbol)) {
        //         let uri = alSymbolHandler.getLastUri() as vscode.Uri;
        //         let alVariable: ALVariable = await this.parseFieldSymbolToALVariable(searchedSymbol, uri);
        //         return alVariable;
        //     }
        // } else {
        //     const alSymbolHandler = new ALSymbolHandler();
        //     let nameRange = DocumentUtils.getNextWordRangeInsideLine(document, variableCallRange);
        //     if (!nameRange) {
        //         throw new Error('Unexpected Error in parseVariableCallToALVariableUsingSymbols with ' + document.getText(variableCallRange));
        //     }
        //     let searchedSymbol = await alSymbolHandler.findSymbol(document, variableCallRange.start, document.getText(nameRange));
        //     if (!isUndefined(searchedSymbol)) {
        //         let uri = alSymbolHandler.getLastUri() as vscode.Uri;
        //         let alVariable: ALVariable = await this.parseFieldSymbolToALVariable(searchedSymbol, uri);
        //         return alVariable;
        //     }
        // }
        // return undefined;
    }
    static parsePrimitiveTypes(document: vscode.TextDocument, variableCallRange: vscode.Range): ALVariable | undefined {
        let alVariable: ALVariable | undefined;
        let variableCall: string = document.getText(variableCallRange);
        if (variableCall.startsWith('\'') && variableCall.endsWith('\'')) {
            alVariable = new ALVariable('arg', undefined, false, 'Text');
        } else if (variableCall.trim().toLowerCase() === "true" || variableCall.trim().toLowerCase() === "false") {
            alVariable = new ALVariable('arg', undefined, false, 'Boolean');
        } else {
            let number = Number(variableCall);
            if (isNaN(number)) {
                return undefined;
            } else if (Number.isInteger(number)) {
                alVariable = new ALVariable('arg', undefined, false, 'Integer');
            } else {
                alVariable = new ALVariable('arg', undefined, false, 'Decimal');
            }
        }
        return alVariable;
    }

    public static getTypeOfVariableDeclaration(variableDeclaration: string): string {
        let variableName = DocumentUtils.getNextWord(variableDeclaration);
        let colonPos = variableDeclaration.indexOf(':', variableName?.length);
        let type = variableDeclaration.substring(colonPos + 1);
        type = type.trim();
        if (type.charAt(type.length - 1) === ';') {
            type = type.substr(0, type.length - 1);
        }
        return type;
    }
}