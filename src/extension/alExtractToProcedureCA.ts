import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { ALProcedure } from './alProcedure';
import { ALProcedureSourceCodeCreator } from './alProcedureSourceCodeCreator';
import { ALSourceCodeHandler } from './alSourceCodeHandler';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { DocumentUtils } from './documentUtils';
import { ALSymbolHandler } from './alSymbolHandler';
import { ALVariable } from './alVariable';
import { ALVariableParser } from './alVariableParser';
import { ALObject } from './alObject';
import { RenameMgt } from './checkRename';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { RangeAnalzyer } from './Extract Procedure/rangeAnalyzer';
import { ReturnTypeAnalzyer } from './Extract Procedure/returnTypeAnalyzer';

export class ALExtractToProcedureCA implements vscode.CodeActionProvider {
    static async renameMethod(): Promise<any> {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let rangeToCursor: vscode.Range = new vscode.Range(editor.selection.start.line, 0, editor.selection.start.line, editor.selection.start.character);
            let newProcedureCharacterPos: number = editor.document.lineAt(editor.selection.start.line).text.indexOf(RenameMgt.newProcedureName + '(');
            let posOfProcedureCall = new vscode.Position(editor.selection.start.line, newProcedureCharacterPos);

            editor.selection = new vscode.Selection(posOfProcedureCall, posOfProcedureCall);
        }
        vscode.commands.executeCommand('editor.action.rename');
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.RefactorExtract
    ];


    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        SyntaxTree.clearInstance();

        let rangeAnalyzer: RangeAnalzyer = new RangeAnalzyer(document, range);
        await rangeAnalyzer.analyze();
        if (!rangeAnalyzer.isValidToExtract()) {
            return;
        }
        let rangeExpanded: vscode.Range = rangeAnalyzer.getExpandedRange();
        let returnTypeAnalzyer: ReturnTypeAnalzyer = new ReturnTypeAnalzyer(document, rangeExpanded);
        await returnTypeAnalzyer.analyze();
        let procedureObject: ALProcedure | undefined = await this.provideProcedureObjectForCodeAction(document, rangeExpanded, returnTypeAnalzyer);
        if (!procedureObject) {
            return;
        }
        let procedureCallingText: string = await ALProcedureSourceCodeCreator.createProcedureCallDefinition(document, rangeExpanded, RenameMgt.newProcedureName, procedureObject.parameters, returnTypeAnalzyer);

        let codeActionToCreateProcedure: vscode.CodeAction | undefined;
        codeActionToCreateProcedure = await this.createCodeAction(document, procedureCallingText, procedureObject, rangeExpanded);
        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            return [codeActionToCreateProcedure];
        }
    }
    public async provideProcedureObjectForCodeAction(document: vscode.TextDocument, rangeExpanded: vscode.Range, returnTypeAnalyzer: ReturnTypeAnalzyer): Promise<ALProcedure | undefined> {

        let procedureOrTrigger: any = await this.getCurrentProcedureOrTriggerSymbol(document, rangeExpanded.start);
        let localVariables: any[] = this.getLocalVariables(procedureOrTrigger);
        let parameters: any[] = this.getParameters(procedureOrTrigger);

        let variablesNeeded: any[] = await this.getVariablesNeededInNewProcedure(localVariables, document, rangeExpanded);
        let parametersNeeded: any[] = await this.getParametersNeededInNewProcedure(parameters, document, rangeExpanded);
        //>>>temporary fix because of bug in al language
        if (procedureOrTrigger.kind === 236) {
            parametersNeeded = await this.getParametersNeededInNewProcedure_TriggerBugFix(parameters, document, rangeExpanded, parametersNeeded);
        }
        //<<<


        let variablesWhichBecomeVarParameters: any[] = await this.getVariablesWhichBecomeVarParameters(variablesNeeded, procedureOrTrigger, document, rangeExpanded);
        let variablesWhichBecomeNormalParameters: any[] = this.getVariablesWhichBecomeNormalParameters(variablesNeeded, procedureOrTrigger, document, rangeExpanded);
        let variablesWhichStayLocalVariables: any[] = this.getVariablesWhichStayLocalVariables(variablesNeeded, variablesWhichBecomeVarParameters, variablesWhichBecomeNormalParameters);

        let parametersWhichBecomeVarParameters: any[] = this.getParametersWhichBecomeVarParameters(parametersNeeded, procedureOrTrigger, document, rangeExpanded);
        let parametersWhichBecomeNormalParameters: any[] = this.getParametersWhichBecomeNormalParameters(parametersNeeded, parametersWhichBecomeVarParameters);

        let procedureToCreate: ALProcedure | undefined;
        procedureToCreate = await this.createProcedureObject(document, rangeExpanded,
            variablesWhichBecomeVarParameters,
            variablesWhichBecomeNormalParameters,
            variablesWhichStayLocalVariables,
            parametersWhichBecomeVarParameters,
            parametersWhichBecomeNormalParameters,
            returnTypeAnalyzer);

        return procedureToCreate;
    }

    async createProcedureObject(document: vscode.TextDocument, rangeExpanded: vscode.Range, variablesWhichBecomeVarParameters: any[], variablesWhichBecomeNormalParameters: any[], variablesWhichStayLocalVariables: any[], parametersWhichBecomeVarParameters: any[], parametersWhichBecomeNormalParameters: any[], returnTypeAnalyzer: ReturnTypeAnalzyer): Promise<ALProcedure | undefined> {
        let procedure: ALProcedure;
        let parameters: ALVariable[] = [];
        let variables: ALVariable[] = [];
        parametersWhichBecomeNormalParameters.forEach(parameterSymbol => { parameters.push(ALVariableParser.parseParameterSymbolToALVariable(parameterSymbol)); });
        parametersWhichBecomeVarParameters.forEach(parameterSymbol => {
            let alVariable: ALVariable = ALVariableParser.parseParameterSymbolToALVariable(parameterSymbol);
            alVariable.isVar = true;
            parameters.push(alVariable);
        });

        // Rec
        let procedureOrTrigger: any = await this.getCurrentProcedureOrTriggerSymbol(document, rangeExpanded.start);
        await this.addRecParameterInCodeunitOnRunTrigger(procedureOrTrigger, document, rangeExpanded, parameters);

        variablesWhichBecomeVarParameters.forEach(variableSymbol => {
            let alVariable: ALVariable = ALVariableParser.parseVariableSymbolToALVariable(variableSymbol);
            alVariable.isVar = true;
            parameters.push(alVariable);
        });
        variablesWhichBecomeNormalParameters.forEach(variableSymbol => parameters.push(ALVariableParser.parseVariableSymbolToALVariable(variableSymbol)));
        variablesWhichStayLocalVariables.forEach(variableSymbol => variables.push(ALVariableParser.parseVariableSymbolToALVariable(variableSymbol)));

        let returnType: string | undefined = returnTypeAnalyzer.getReturnType();

        let alObjectSymbol = await ALCodeOutlineExtension.getFirstObjectSymbolOfDocumentUri(document.uri);
        let alObject: ALObject = new ALObject(alObjectSymbol.name, alObjectSymbol.icon, alObjectSymbol.id, document.uri);
        procedure = new ALProcedure(RenameMgt.newProcedureName, parameters, variables, returnType, true, alObject);
        let selectedText: string = document.getText(rangeExpanded).trim();
        if (returnType && returnTypeAnalyzer.getAddVariableToExtractedRange()) {
            let returnVariableName = 'returnValue';

            procedure.setReturnVariableName(returnVariableName);
            selectedText = returnVariableName + ' := ' + selectedText;
        }
        if (!selectedText.endsWith(';')) {
            selectedText += ';';
        }
        selectedText = this.fixIndentation(document, rangeExpanded, selectedText);
        procedure.setBody(selectedText);
        return procedure;
    }
    getVariablesWhichStayLocalVariables(variablesNeeded: any[], variablesWhichBecomeVarParameters: any[], variablesWhichBecomeNormalParameters: any[]): any[] {
        let variablesWhichStayLocal: ALVariable[] = variablesNeeded.filter(variable =>
            !variablesWhichBecomeNormalParameters.includes(variable) &&
            !variablesWhichBecomeVarParameters.includes(variable));
        return variablesWhichStayLocal;
    }
    getVariablesWhichBecomeNormalParameters(variablesNeeded: any[], procedureOrTrigger: any, document: vscode.TextDocument, rangeSelected: vscode.Range): any[] {
        return [];
    }
    async getVariablesWhichBecomeVarParameters(variablesNeeded: any[], procedureOrTrigger: any, document: vscode.TextDocument, rangeSelected: vscode.Range): Promise<any[]> {
        let bodyTreeNode: ALFullSyntaxTreeNode | undefined = (await SyntaxTree.getInstance(document)).findTreeNode(rangeSelected.start, [FullSyntaxTreeNodeKind.getBlock()]);
        if (!bodyTreeNode || !bodyTreeNode?.fullSpan) {
            return variablesNeeded;
        }
        let identifierNames: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(bodyTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), true, identifierNames);
        let bodyRangeOfProcedure: vscode.Range = TextRangeExt.createVSCodeRange(bodyTreeNode.fullSpan);
        let rangeBeforeSelection: vscode.Range = new vscode.Range(bodyRangeOfProcedure.start, rangeSelected.start);
        let rangeAfterSelection: vscode.Range = new vscode.Range(rangeSelected.end, bodyRangeOfProcedure.end);

        let variablesBecomingVarParameters: any[] = [];
        for (let i = 0; i < variablesNeeded.length; i++) {
            let variable = variablesNeeded[i];
            let isTemporary: boolean = false;
            let isProcedureCallOnObject: boolean = false;
            let isVarParameterOfOtherProcedurecall: boolean = false;
            let isUsedOutsideSelectedRange: boolean = false;
            // isTemporary = this.isSymbolTemporary(variable);

            let positionVariableDeclaration = new vscode.Position(variable.selectionRange.start.line, variable.selectionRange.start.character);
            let references: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, positionVariableDeclaration);
            if (references && references.length > 0) {
                for (let reference of references) {
                    if (rangeBeforeSelection.contains(reference.range)) {
                        isUsedOutsideSelectedRange = true;
                        //     // TODO: If part of procedure call as var, then it has also to be a var-Parameter
                        //     isVarParameterOfOtherProcedurecall = this.isVarParameterOfOtherProcedureCall(rangeBeforeSelection, reference.range, document);
                        //     // If procedure call on this object, then the instance has to be handed over as var-Parameter as well.
                        //     isProcedureCallOnObject = this.isProcedureCallOnObject(rangeBeforeSelection, reference.range, document);
                    }
                    if (rangeAfterSelection.contains(reference.range)) {
                        isUsedOutsideSelectedRange = true;
                    }
                }
            }
            // if (isTemporary || isProcedureCallOnObject) {
            if (isUsedOutsideSelectedRange) {
                variablesBecomingVarParameters.push(variable);
            }
        }

        return variablesBecomingVarParameters;
    }
    getParametersWhichBecomeNormalParameters(parametersNeeded: any[], parametersWhichBecomeVarParameters: any[]): any[] {
        return [];
    }
    getParametersWhichBecomeVarParameters(parametersNeeded: any[], procedureOrTrigger: any, document: vscode.TextDocument, rangeSelected: vscode.Range): any[] {
        return parametersNeeded;
    }
    private async addRecParameterInCodeunitOnRunTrigger(procedureOrTrigger: any, document: vscode.TextDocument, rangeExpanded: vscode.Range, parameters: ALVariable[]) {
        if (procedureOrTrigger.kind === 236 && procedureOrTrigger.name.toLowerCase() === 'onrun') {
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let cuObjects: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getCodeunitObject());
            if (cuObjects) {
                let cuObject: ALFullSyntaxTreeNode = cuObjects[0];
                let propertyLists: ALFullSyntaxTreeNode[] = [];
                ALFullSyntaxTreeNodeExt.collectChildNodes(cuObject, FullSyntaxTreeNodeKind.getPropertyList(), false, propertyLists);
                if (propertyLists.length === 1) {
                    let propertyList: ALFullSyntaxTreeNode = propertyLists[0];
                    let properties: ALFullSyntaxTreeNode[] = [];
                    ALFullSyntaxTreeNodeExt.collectChildNodes(propertyList, FullSyntaxTreeNodeKind.getProperty(), false, properties);
                    if (properties.length > 0) {
                        let tableNoProperties: ALFullSyntaxTreeNode[] = properties.filter(property => property.name && property.name.trim().toLowerCase() === 'tableno');
                        if (tableNoProperties.length > 0) {
                            let tableNoProperty: ALFullSyntaxTreeNode = tableNoProperties[0];
                            if (tableNoProperty.childNodes && tableNoProperty.childNodes.length === 2) {
                                let rangeOfTableNo: vscode.Range = TextRangeExt.createVSCodeRange(tableNoProperty.childNodes[1].fullSpan);
                                let type = 'Record ' + document.getText(rangeOfTableNo);
                                if (document.getText(rangeExpanded).includes('Rec')) {
                                    parameters.push(new ALVariable('Rec', procedureOrTrigger.name, true, type));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    isVarParameterOfOtherProcedureCall(rangeBeforeSelection: vscode.Range, referenceRange: vscode.Range, document: vscode.TextDocument): boolean {
        let isInQuotes: boolean = DocumentUtils.isPositionInQuotes(document, rangeBeforeSelection, referenceRange.start);
        let isInProcedureCall: boolean = DocumentUtils.isPositionInProcedurecall(document, rangeBeforeSelection, referenceRange.start);
        let openingBracketPosition: vscode.Position = DocumentUtils.getPreviousValidPositionOfCharacter(document, rangeBeforeSelection, referenceRange.start, '(');
        return false;
    }
    private isSymbolTemporary(variable: any): boolean {
        let subtype: string = variable.subtype;
        return subtype.includes('temporary');
    }
    private isProcedureCallOnObject(rangeBeforeSelection: vscode.Range, referenceRange: vscode.Range, document: vscode.TextDocument) {
        let afterDotPosition: vscode.Position = referenceRange.end.translate(0, 1);
        let nextCharacter = document.getText(new vscode.Range(referenceRange.end, afterDotPosition));
        if (nextCharacter === '.') {
            let procedureNameRange = DocumentUtils.getNextWordRangeInsideLine(document, rangeBeforeSelection, afterDotPosition);
            if (procedureNameRange) {
                let procedureName: string = document.getText(procedureNameRange);
                let openingBracket = document.getText(new vscode.Range(procedureNameRange.end, procedureNameRange.end.translate(0, 1)));
                if (openingBracket === '(') {
                    let procedureSymbol: any = new ALSymbolHandler().findSymbol(document, procedureNameRange.start, procedureName);
                    if (procedureSymbol) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getBodyRangeOfProcedure(document: vscode.TextDocument, procedureOrTrigger: any): vscode.Range {
        let bodyRange: vscode.Range | undefined;
        let procedureRange: vscode.Range = new vscode.Range(procedureOrTrigger.range.start.line, procedureOrTrigger.range.start.character, procedureOrTrigger.range.end.line, procedureOrTrigger.range.end.character);
        // find beginning
        for (let i = procedureRange.start.line; i <= procedureRange.end.line; i++) {
            if (document.lineAt(i).text.match(/^\s+\bbegin\b/)) {
                bodyRange = new vscode.Range(i + 1, 0, procedureRange.end.line, procedureRange.end.character);
                break;
            }
        }
        if (!bodyRange) {
            throw new Error('Could not find beginning of procedure or trigger in document ' + document.fileName + ' of procedure ' + procedureOrTrigger.name);
        } else {
            return bodyRange;
        }
    }
    async getParametersNeededInNewProcedure(parameters: any[], document: vscode.TextDocument, rangeSelected: vscode.Range): Promise<any[]> {
        let parametersNeeded: any[] = [];
        for (let i = 0; i < parameters.length; i++) {
            let parameter = parameters[i];
            let position = new vscode.Position(parameter.selectionRange.start.line, parameter.selectionRange.start.character);
            let references: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, position);
            if (references && references.length > 0) {
                for (let reference of references) {
                    if (rangeSelected.contains(reference.range)) {
                        parametersNeeded.push(parameter);
                        break;
                    }
                }
            }
        }
        return parametersNeeded;
    }
    private async getParametersNeededInNewProcedure_TriggerBugFix(parameters: any[], document: vscode.TextDocument, rangeExpanded: vscode.Range, parametersNeeded: any[]): Promise<any[]> {
        for (let i = 0; i < parameters.length; i++) {
            let parameter = parameters[i];
            for (let lineNo = rangeExpanded.start.line; lineNo <= rangeExpanded.end.line; lineNo++) {
                let lineText: string = document.lineAt(lineNo).text;
                let indexOfParameterName = lineText.search(new RegExp('\\b' + parameter.name + '\\b'));
                if (indexOfParameterName > 0) {
                    let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, new vscode.Position(lineNo, indexOfParameterName));
                    if (locations && locations.length > 0) {
                        let location = locations[0];
                        let paramterRange: vscode.Range = TextRangeExt.createVSCodeRange(parameter.range);
                        if (paramterRange.contains(location.range)) {
                            parametersNeeded.push(parameter);
                            break;
                        }
                    }
                }
            }
        }
        return parametersNeeded;
    }
    async getVariablesNeededInNewProcedure(localVariables: any[], document: vscode.TextDocument, rangeSelected: vscode.Range): Promise<any[]> {
        let variablesNeeded: any[] = [];
        for (let i = 0; i < localVariables.length; i++) {
            let localVariable = localVariables[i];
            let position = new vscode.Position(localVariable.selectionRange.start.line, localVariable.selectionRange.start.character);
            let references: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, position);
            if (references && references.length > 0) {
                for (let reference of references) {
                    if (rangeSelected.contains(reference.range)) {
                        variablesNeeded.push(localVariable);
                        break;
                    }
                }
            }
        }
        return variablesNeeded;
    }
    getParameters(procedureOrTrigger: any): any[] {
        let parameters: any[] = [];
        procedureOrTrigger.collectChildSymbols(240, true, parameters); //240 = parameters
        if (!parameters) {
            parameters = [];
        }
        return parameters;
    }
    getLocalVariables(procedureOrTrigger: any): any[] {
        let localVariables: any[] = [];
        procedureOrTrigger.collectChildSymbols(241, true, localVariables); //241 = local variables
        if (!localVariables) {
            localVariables = [];
        }
        return localVariables;
    }
    async getCurrentProcedureOrTriggerSymbol(document: vscode.TextDocument, position: vscode.Position): Promise<any> {
        return await ALCodeOutlineExtension.getProcedureOrTriggerSymbolOfCurrentLine(document.uri, position.line);
    }
    isResponseSymbolPartOfProcedure(currentResponseSymbol: any): boolean {
        let symbolToCheck = currentResponseSymbol;
        while (symbolToCheck.parent) {
            if (symbolToCheck.parent.name === 'InvocationExpression') {
                return true;
            } else {
                symbolToCheck = symbolToCheck.parent;
            }
        }
        return false;
    }
    getProcedureResponseSymbolWhereCurrentResponseSymbolIsPartOf(currentResponseSymbol: any): any {
        let symbolToCheck = currentResponseSymbol;
        while (symbolToCheck.parent) {
            if (symbolToCheck.parent.name === 'InvocationExpression') {
                return symbolToCheck.parent;
            } else {
                symbolToCheck = symbolToCheck.parent;
            }
        }
        throw new Error('Current response symbol is not a part of a procedure call');
    }

    private async createCodeAction(currentDocument: vscode.TextDocument, procedureCallingText: string, procedureToCreate: ALProcedure, rangeExpanded: vscode.Range): Promise<vscode.CodeAction | undefined> {
        let codeActionToCreateProcedure: vscode.CodeAction = await this.createFixToCreateProcedure(procedureToCreate, procedureCallingText, currentDocument, rangeExpanded);

        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            codeActionToCreateProcedure.isPreferred = true;
            return codeActionToCreateProcedure;
        }
    }

    private async createFixToCreateProcedure(procedure: ALProcedure, procedureCallingText: string, document: vscode.TextDocument, rangeExpanded: vscode.Range): Promise<vscode.CodeAction> {
        const fix = new vscode.CodeAction(`Extract to procedure`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();

        let position: vscode.Position = await new ALSourceCodeHandler(document).getPositionToInsertProcedure(rangeExpanded.end.line);
        let textToInsert = ALProcedureSourceCodeCreator.createProcedureDefinition(procedure);
        textToInsert = ALProcedureSourceCodeCreator.addLineBreaksToProcedureCall(document, position, textToInsert);
        fix.edit.insert(document.uri, position, textToInsert);

        fix.edit.replace(document.uri, rangeExpanded, procedureCallingText);
        fix.command = {
            command: 'alcodeactions.renameMethod',
            title: 'Extract Method'
        };
        return fix;
    }
    private fixIndentation(document: vscode.TextDocument, rangeExpanded: vscode.Range, selectedText: string) {
        let firstNonWhiteSpaceCharacter = document.lineAt(rangeExpanded.start.line).firstNonWhitespaceCharacterIndex;
        let whiteSpacesSelectedText = '';
        for (let i = 0; i < firstNonWhiteSpaceCharacter; i++) {
            whiteSpacesSelectedText += ' ';
        }
        let whiteSpacesInProcedure = '';
        for (let i = 0; i < 8; i++) {
            whiteSpacesInProcedure += ' ';
        }
        selectedText = selectedText.replace(new RegExp('\r\n' + whiteSpacesSelectedText, 'g'), '\r\n' + whiteSpacesInProcedure);
        return selectedText;
    }
}

