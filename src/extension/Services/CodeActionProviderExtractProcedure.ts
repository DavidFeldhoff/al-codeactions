import { TextDocument, Range, CodeAction, Position, Location, commands, CodeActionKind, WorkspaceEdit, window, Selection } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from '../AL Code Outline Ext/syntaxTreeExt';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { CreateProcedure } from '../Create Procedure/Procedure Creator/CreateProcedure';
import { AccessModifier } from '../Entities/accessModifier';
import { ALObject } from '../Entities/alObject';
import { ALProcedure } from '../Entities/alProcedure';
import { ALVariable } from '../Entities/alVariable';
import { Command } from '../Entities/Command';
import { ALObjectParser } from '../Entity Parser/alObjectParser';
import { ALParameterParser } from '../Entity Parser/alParameterParser';
import { ALVariableParser } from '../Entity Parser/alVariableParser';
import { RangeAnalyzer } from '../Extract Procedure/rangeAnalyzer';
import { ReturnTypeAnalyzer } from '../Extract Procedure/returnTypeAnalyzer';
import { RenameMgt } from '../renameMgt';
import { DocumentUtils } from '../Utils/documentUtils';
import { Err } from '../Utils/Err';
import { ICodeActionProvider } from './ICodeActionProvider';

export class CodeActionProviderExtractProcedure implements ICodeActionProvider {
    document: TextDocument;
    range: Range;
    selectedRange: Range;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
        this.selectedRange = range;
    }
    async considerLine(): Promise<boolean> {
        if (this.range.start.compareTo(this.range.end) === 0) { //performance
            return false;
        }
        if (this.document.uri.scheme == 'al-preview')
            return false
        this.range = DocumentUtils.trimRange(this.document, this.selectedRange)
        if (this.document.lineAt(this.range.start).firstNonWhitespaceCharacterIndex <= 4 ||
            this.document.lineAt(this.range.end).firstNonWhitespaceCharacterIndex <= 4)
            return false;
        return true;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        let rangeAnalyzer: RangeAnalyzer = new RangeAnalyzer(this.document, this.selectedRange);
        await rangeAnalyzer.analyze();
        if (!rangeAnalyzer.isValidToExtract()) {
            return [];
        }
        let rangeExpanded: Range = rangeAnalyzer.getExpandedRange();
        const trimmedSelectedRangeWithComments: Range = rangeAnalyzer.getTrimmedSelectedRangeWithComments();
        let treeNodeStart: ALFullSyntaxTreeNode = rangeAnalyzer.getTreeNodeToExtractStart();
        let treeNodeEnd: ALFullSyntaxTreeNode = rangeAnalyzer.getTreeNodeToExtractEnd();

        let returnTypeAnalyzer: ReturnTypeAnalyzer = new ReturnTypeAnalyzer(this.document, treeNodeStart, treeNodeEnd);
        await returnTypeAnalyzer.analyze();
        if (rangeAnalyzer.isValidToExtractOnlyWithReturnType() && !returnTypeAnalyzer.getReturnType()) {
            return [];
        }
        let procedureObject: ALProcedure | undefined = await this.provideProcedureObjectForCodeAction(rangeExpanded, trimmedSelectedRangeWithComments, returnTypeAnalyzer);
        if (!procedureObject) {
            return [];
        }
        let procedureCallingText: string = await CreateProcedure.createProcedureCallDefinition(this.document, rangeExpanded, RenameMgt.newProcedureName, procedureObject.parameters, returnTypeAnalyzer);

        let codeActionToCreateProcedure: CodeAction = this.createCodeAction(this.document, 'Extract to procedure', procedureCallingText, procedureObject, rangeExpanded, trimmedSelectedRangeWithComments, false);
        let codeActionToCreateProcedureWithPublishers: CodeAction = this.createCodeAction(this.document, 'Extract to procedure with advanced options', procedureCallingText, procedureObject, rangeExpanded, trimmedSelectedRangeWithComments, true);
        return [codeActionToCreateProcedure, codeActionToCreateProcedureWithPublishers];
    }
    public async provideProcedureObjectForCodeAction(rangeExpanded: Range, trimmedSelectedRangeWithComments: Range, returnTypeAnalyzer: ReturnTypeAnalyzer): Promise<ALProcedure | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        const objectNode = ALFullSyntaxTreeNodeExt.findTreeNode(syntaxTree.getRoot(), rangeExpanded.start, FullSyntaxTreeNodeKind.getAllObjectKinds())!;
        const procedureOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeExpanded.start);
        if (!procedureOrTriggerTreeNode) {
            return;
        }
        const localVariableTreeNodes: ALFullSyntaxTreeNode[] = this.getLocalVariablesOfTreeNode(procedureOrTriggerTreeNode);
        const parameterTreeNodes: ALFullSyntaxTreeNode[] = this.getParametersOfTreeNode(procedureOrTriggerTreeNode);
        const returnVariableTreeNode: ALFullSyntaxTreeNode | undefined = this.getReturnVariableOfTreeNode(procedureOrTriggerTreeNode);
        const dataItemTreeNodes: ALFullSyntaxTreeNode[] = this.getDataItemsOfTreeNode(objectNode);

        let variablesNeeded: ALFullSyntaxTreeNode[] = await this.getALVariablesNeededInNewProcedure(localVariableTreeNodes, this.document, rangeExpanded);
        let parametersNeeded: ALFullSyntaxTreeNode[] = await this.getParametersNeededInNewProcedure(parameterTreeNodes, this.document, rangeExpanded);
        let returnVariableNeeded: ALFullSyntaxTreeNode | undefined = await this.getReturnVariableNeeded(returnVariableTreeNode, this.document, rangeExpanded);
        let dataItemsNeeded: ALFullSyntaxTreeNode[] = await this.getDataItemsNeededInNewProcedure(dataItemTreeNodes, this.document, rangeExpanded);

        let variableTreeNodesWhichBecomeVarParameters: ALFullSyntaxTreeNode[] = await this.getVariablesWhichBecomeVarParameters(variablesNeeded, this.document, rangeExpanded);
        let variableTreeNodesWhichBecomeNormalParameters: ALFullSyntaxTreeNode[] = this.getVariablesWhichBecomeNormalParameters();
        let variableTreeNodesWhichStayLocalVariables: ALFullSyntaxTreeNode[] = this.getVariablesWhichStayLocalVariables(variablesNeeded, variableTreeNodesWhichBecomeVarParameters, variableTreeNodesWhichBecomeNormalParameters);

        let parameterTreeNodesWhichBecomeVarParameters: ALFullSyntaxTreeNode[] = this.getParametersWhichBecomeVarParameters(parametersNeeded);
        let parameterTreeNodesWhichBecomeNormalParameters: ALFullSyntaxTreeNode[] = this.getParametersWhichBecomeNormalParameters();

        let returnVariableTreeNodeWhichBecomesVarParameter: ALFullSyntaxTreeNode | undefined = this.getReturnVariableWhichBecomesVarParameter(returnVariableNeeded);

        let dataItemsWhichBecomeVarParameters: ALFullSyntaxTreeNode[] = this.getDataItemsWhichBecomeVarParameters(dataItemsNeeded)
        //Codeunit onRun Trigger implicitly has a Rec Variable which is declared nowhere
        let typeOfRecWhichBecomesVarParameter: string | undefined = await this.getSourceTableTypeOfCodeunitOnRunTrigger(this.document, rangeExpanded);

        let procedureToCreate: ALProcedure | undefined;
        procedureToCreate = await this.createProcedureObject(this.document, rangeExpanded, trimmedSelectedRangeWithComments,
            variableTreeNodesWhichBecomeVarParameters,
            variableTreeNodesWhichBecomeNormalParameters,
            variableTreeNodesWhichStayLocalVariables,
            parameterTreeNodesWhichBecomeVarParameters,
            parameterTreeNodesWhichBecomeNormalParameters,
            returnVariableTreeNodeWhichBecomesVarParameter,
            dataItemsWhichBecomeVarParameters,
            typeOfRecWhichBecomesVarParameter,
            returnTypeAnalyzer);

        return procedureToCreate;
    }

    async createProcedureObject(document: TextDocument, rangeExpanded: Range, trimmedSelectedRangeWithComments: Range, variableTreeNodesWhichBecomeVarParameters: ALFullSyntaxTreeNode[], variableTreeNodesWhichBecomeNormalParameters: ALFullSyntaxTreeNode[], variableTreeNodesWhichStayLocalVariables: ALFullSyntaxTreeNode[], parametersWhichBecomeVarParameters: ALFullSyntaxTreeNode[], parametersWhichBecomeNormalParameters: ALFullSyntaxTreeNode[], returnVariableWhichBecomesVarParameter: ALFullSyntaxTreeNode | undefined, dataItemsWhichBecomeVarParameters: ALFullSyntaxTreeNode[], typeOfRecWhichBecomesVarParameter: string | undefined, returnTypeAnalyzer: ReturnTypeAnalyzer): Promise<ALProcedure | undefined> {
        let procedure: ALProcedure;
        let parameters: ALVariable[] = [];
        let variables: ALVariable[] = [];

        //Codeunit onRun Trigger implicitly has a Rec Variable which is declared nowhere
        if (typeOfRecWhichBecomesVarParameter) {
            parameters.push(new ALVariable('Rec', typeOfRecWhichBecomesVarParameter, 'OnRun', true).sanitizeName())
        }

        for (let i = 0; i < parametersWhichBecomeNormalParameters.length; i++) {
            parameters.push(await ALParameterParser.parseParameterTreeNodeToALVariable(document, parametersWhichBecomeNormalParameters[i], false));
        }
        for (let i = 0; i < parametersWhichBecomeVarParameters.length; i++) {
            let alVariable: ALVariable = await ALParameterParser.parseParameterTreeNodeToALVariable(document, parametersWhichBecomeVarParameters[i], false);
            alVariable.isVar = true;
            parameters.push(alVariable);
        }

        let alVariablesWhichBecomeVarParameters: ALVariable[] = ALVariableParser.parseVariableTreeNodeArrayToALVariableArray(document, variableTreeNodesWhichBecomeVarParameters, false);
        alVariablesWhichBecomeVarParameters.forEach(variable => {
            variable.isVar = true;
            parameters.push(variable);
        });
        let alVariablesWhichBecomeNormalParameters: ALVariable[] = ALVariableParser.parseVariableTreeNodeArrayToALVariableArray(document, variableTreeNodesWhichBecomeNormalParameters, false);
        alVariablesWhichBecomeNormalParameters.forEach(variable => {
            parameters.push(variable);
        });
        let alVariablesWhichStayLocalVariables: ALVariable[] = ALVariableParser.parseVariableTreeNodeArrayToALVariableArray(document, variableTreeNodesWhichStayLocalVariables, false);
        alVariablesWhichStayLocalVariables.forEach(variable => {
            variables.push(variable);
        });
        for (const dataItemWhichBecomesVarParameter of dataItemsWhichBecomeVarParameters) {
            parameters.push(await ALVariableParser.parseDataItemToALVariable(document, dataItemWhichBecomesVarParameter, false))
        }
        if (returnVariableWhichBecomesVarParameter) {
            let alVariable: ALVariable = await ALVariableParser.parseReturnValueTreeNodeToALVariable(document, returnVariableWhichBecomesVarParameter, false);
            if (alVariable.name != undefined) { //not possible that this variable was used in the extracted code
                alVariable.isVar = true;
                parameters.push(alVariable);
            }
        }

        let returnType: string | undefined = returnTypeAnalyzer.getReturnType();

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, rangeExpanded.start);
        if (!objectTreeNode) {
            Err._throw('Unable to find object tree node');
        }
        let alObject: ALObject = ALObjectParser.parseObjectTreeNodeToALObject(document, objectTreeNode);
        procedure = new ALProcedure(RenameMgt.newProcedureName, parameters, variables, returnType, AccessModifier.local, [], false, false, alObject);
        let selectedText: string = document.getText(rangeExpanded).trim();
        if (returnType && returnTypeAnalyzer.getAddVariableToExtractedRange()) {
            let returnVariableName = 'returnValue';

            procedure.setReturnVariableName(returnVariableName);
            selectedText = returnVariableName + ' := ' + selectedText;
        }
        if (rangeExpanded.start.compareTo(trimmedSelectedRangeWithComments.start) !== 0)
            selectedText = this.document.getText(new Range(trimmedSelectedRangeWithComments.start, rangeExpanded.start)) + selectedText;
        if (!selectedText.endsWith(';')) {
            selectedText += ';';
        }
        selectedText = this.fixIndentation(document, rangeExpanded, selectedText);
        procedure.setBody(selectedText);
        return procedure;
    }
    getVariablesWhichStayLocalVariables(variablesNeeded: ALFullSyntaxTreeNode[], variablesWhichBecomeVarParameters: ALFullSyntaxTreeNode[], variablesWhichBecomeNormalParameters: ALFullSyntaxTreeNode[]): ALFullSyntaxTreeNode[] {
        let variablesWhichStayLocal: ALFullSyntaxTreeNode[] = variablesNeeded.filter(variable =>
            !variablesWhichBecomeNormalParameters.includes(variable) &&
            !variablesWhichBecomeVarParameters.includes(variable));
        return variablesWhichStayLocal;
    }
    getVariablesWhichBecomeNormalParameters(): any[] {
        return [];
    }
    async getVariablesWhichBecomeVarParameters(variablesNeeded: ALFullSyntaxTreeNode[], document: TextDocument, rangeSelected: Range): Promise<ALFullSyntaxTreeNode[]> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeSelected.start);
        if (!methodOrTriggerTreeNode)
            return variablesNeeded;
        let bodyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false);
        if (!bodyTreeNode || !bodyTreeNode?.fullSpan) {
            return variablesNeeded;
        }

        let bodyRangeOfProcedure: Range = TextRangeExt.createVSCodeRange(bodyTreeNode.fullSpan);
        let rangeBeforeSelection: Range = new Range(bodyRangeOfProcedure.start, rangeSelected.start);
        let rangeAfterSelection: Range = new Range(rangeSelected.end, bodyRangeOfProcedure.end);

        let variablesBecomingVarParameters: any[] = [];
        for (let i = 0; i < variablesNeeded.length; i++) {
            let variable: ALFullSyntaxTreeNode = variablesNeeded[i];
            if (!variable.kind) {
                continue;
            }
            let isUsedOutsideSelectedRange: boolean = false;

            //variableDeclaration and variableDeclarationName behave the same here
            let positionOfVariableDeclaration: Position = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(variable.fullSpan)).start;
            if (await this.isOneOfReferencesInRange(document, positionOfVariableDeclaration, rangeBeforeSelection)) {
                isUsedOutsideSelectedRange = true;
            } else if (await this.isOneOfReferencesInRange(document, positionOfVariableDeclaration, rangeAfterSelection)) {
                isUsedOutsideSelectedRange = true;
            }
            // TODO: If part of procedure call as var, then it has also to be a var-Parameter

            if (isUsedOutsideSelectedRange) {
                variablesBecomingVarParameters.push(variable);
            }
        }

        return variablesBecomingVarParameters;
    }
    getParametersWhichBecomeNormalParameters(): ALFullSyntaxTreeNode[] {
        return [];
    }

    getReturnVariableWhichBecomesVarParameter(returnVariableTreeNode: ALFullSyntaxTreeNode | undefined): ALFullSyntaxTreeNode | undefined {
        return returnVariableTreeNode;
    }

    getDataItemsWhichBecomeVarParameters(dataItemsNeeded: ALFullSyntaxTreeNode[]): ALFullSyntaxTreeNode[] {
        return dataItemsNeeded
    }
    getParametersWhichBecomeVarParameters(parametersNeeded: ALFullSyntaxTreeNode[]): ALFullSyntaxTreeNode[] {
        return parametersNeeded;
    }
    private async getSourceTableTypeOfCodeunitOnRunTrigger(document: TextDocument, rangeExpanded: Range): Promise<string | undefined> {
        let textOfSelectedRange: string = document.getText(rangeExpanded);
        if (textOfSelectedRange.match(/\bRec\b/) || textOfSelectedRange.match(/\bxRec\b/)) {
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeExpanded.start);
            if (methodOrTriggerTreeNode && methodOrTriggerTreeNode.kind === FullSyntaxTreeNodeKind.getTriggerDeclaration()) {
                let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
                if (identifierTreeNode && identifierTreeNode.identifier && identifierTreeNode.identifier.toLowerCase() === 'onrun') {
                    let cuObjects: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getCodeunitObject());
                    if (cuObjects.length === 1) {
                        let cuObject: ALFullSyntaxTreeNode = cuObjects[0];
                        let valueOfPropertyTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getValueOfPropertyName(document, cuObject, 'TableNo');
                        if (valueOfPropertyTreeNode) {
                            let rangeOfTableNo: Range = TextRangeExt.createVSCodeRange(valueOfPropertyTreeNode.fullSpan);
                            let type = 'Record ' + document.getText(rangeOfTableNo);
                            return type;
                        }
                    }
                }
            }
        }
        return undefined;
    }


    isVarParameterOfOtherProcedureCall(): boolean {
        return false;
    }

    async getParametersNeededInNewProcedure(parameters: ALFullSyntaxTreeNode[], document: TextDocument, rangeSelected: Range): Promise<ALFullSyntaxTreeNode[]> {
        let parametersNeeded: ALFullSyntaxTreeNode[] = [];
        for (let i = 0; i < parameters.length; i++) {
            let parameterTreeNode: ALFullSyntaxTreeNode = parameters[i];
            let identifierTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(parameterTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false);
            if (!identifierTreeNode) {
                continue;
            }
            let range: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            if (await this.isOneOfReferencesInRange(document, range.start, rangeSelected)) {
                parametersNeeded.push(parameterTreeNode);
            }
        }
        return parametersNeeded;
    }
    async getALVariablesNeededInNewProcedure(localVariableTreeNodes: ALFullSyntaxTreeNode[], document: TextDocument, rangeSelected: Range): Promise<ALFullSyntaxTreeNode[]> {
        let variablesNeeded: ALFullSyntaxTreeNode[] = [];
        for (let i = 0; i < localVariableTreeNodes.length; i++) {
            let localVariable: ALFullSyntaxTreeNode = localVariableTreeNodes[i];
            if (!localVariable.kind) { continue; }

            switch (localVariable.kind) {
                case FullSyntaxTreeNodeKind.getVariableDeclaration():
                    let range: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(localVariable.fullSpan));
                    if (await this.isOneOfReferencesInRange(document, range.start, rangeSelected)) {
                        variablesNeeded.push(localVariable);
                    }
                    break;
                case FullSyntaxTreeNodeKind.getVariableListDeclaration():
                    let variableDeclarationNames: ALFullSyntaxTreeNode[] = [];
                    ALFullSyntaxTreeNodeExt.collectChildNodes(localVariable, FullSyntaxTreeNodeKind.getVariableDeclarationName(), false, variableDeclarationNames);
                    for (let x = 0; x < variableDeclarationNames.length; x++) {
                        let range: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(variableDeclarationNames[x].fullSpan));
                        if (await this.isOneOfReferencesInRange(document, range.start, rangeSelected)) {
                            variablesNeeded.push(variableDeclarationNames[x]);
                        }
                    }
                    break;
            }
        }
        return variablesNeeded;
    }
    async getReturnVariableNeeded(returnVariableTreeNode: ALFullSyntaxTreeNode | undefined, document: TextDocument, rangeExpanded: Range): Promise<ALFullSyntaxTreeNode | undefined> {
        if (returnVariableTreeNode && returnVariableTreeNode.childNodes) {
            if (returnVariableTreeNode.childNodes.length == 2) {
                let rangeOfIdentifier = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(returnVariableTreeNode.childNodes[0].fullSpan));
                if (await this.isOneOfReferencesInRange(document, rangeOfIdentifier.start, rangeExpanded)) {
                    return returnVariableTreeNode;
                }
            }
        }
        return undefined;
    }
    private async getDataItemsNeededInNewProcedure(dataItemTreeNodes: ALFullSyntaxTreeNode[], document: TextDocument, rangeSelected: Range): Promise<ALFullSyntaxTreeNode[] | PromiseLike<ALFullSyntaxTreeNode[]>> {
        let dataItemsNeeded: ALFullSyntaxTreeNode[] = []
        for (const dataItemTreeNode of dataItemTreeNodes) {
            const identifierNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(dataItemTreeNode, FullSyntaxTreeNodeKind.getIdentifierName(), false)
            if (identifierNode) {
                let range: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierNode.fullSpan));
                if (await this.isOneOfReferencesInRange(document, range.start, rangeSelected)) {
                    dataItemsNeeded.push(identifierNode);
                }
            }
        }
        return []; //data items are also global, so it's not needed to hand them over
        return dataItemsNeeded
    }
    private async isOneOfReferencesInRange(document: TextDocument, positionToCallReference: Position, rangeToCheck: Range): Promise<boolean> {
        let references: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', document.uri, positionToCallReference);
        if (references && references.length > 0) {
            for (let reference of references) {
                if (rangeToCheck.contains(reference.range)) {
                    return true;
                }
            }
        }
        return false;
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
    private getLocalVariablesOfTreeNode(procedureOrTriggerTreeNode: ALFullSyntaxTreeNode): ALFullSyntaxTreeNode[] {
        let variableDeclarations: ALFullSyntaxTreeNode[] = [];
        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(procedureOrTriggerTreeNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        if (varSection) {
            ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableDeclaration(), false, variableDeclarations);
            ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableListDeclaration(), false, variableDeclarations);
        }
        return variableDeclarations;
    }
    private getParametersOfTreeNode(procedureOrTriggerTreeNode: ALFullSyntaxTreeNode): ALFullSyntaxTreeNode[] {
        let parameters: ALFullSyntaxTreeNode[] = [];
        let parameterListTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(procedureOrTriggerTreeNode, FullSyntaxTreeNodeKind.getParameterList(), false);
        if (parameterListTreeNode) {
            ALFullSyntaxTreeNodeExt.collectChildNodes(parameterListTreeNode, FullSyntaxTreeNodeKind.getParameter(), false, parameters);
        }
        return parameters;
    }
    private getReturnVariableOfTreeNode(procedureOrTriggerTreeNode: ALFullSyntaxTreeNode): ALFullSyntaxTreeNode | undefined {
        let returnValue: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(procedureOrTriggerTreeNode, FullSyntaxTreeNodeKind.getReturnValue(), false);
        if (returnValue) {
            if (returnValue.childNodes && returnValue.childNodes.length === 2) {
                return returnValue;
            }
        }
        return undefined;
    }
    private getDataItemsOfTreeNode(objectTreeNode: ALFullSyntaxTreeNode): ALFullSyntaxTreeNode[] {
        return ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(objectTreeNode, [FullSyntaxTreeNodeKind.getReportDataItem()], true)
    }
    private createCodeAction(currentDocument: TextDocument, title: string, procedureCallingText: string, procedureToCreate: ALProcedure, rangeExpanded: Range, trimmedSelectedRangeWithComments: Range, advancedProcedureCreation: boolean): CodeAction {
        let codeAction = new CodeAction(title, CodeActionKind.RefactorExtract);
        codeAction.command = {
            command: Command.extractProcedure,
            arguments: [currentDocument, procedureCallingText, procedureToCreate, rangeExpanded, trimmedSelectedRangeWithComments, { advancedProcedureCreation: advancedProcedureCreation }],
            title: title
        };
        return codeAction;
    }

    private fixIndentation(document: TextDocument, rangeExpanded: Range, selectedText: string) {
        let firstNonWhiteSpaceCharacter = document.lineAt(rangeExpanded.start.line).firstNonWhitespaceCharacterIndex;
        let whiteSpacesSelectedText = '';
        for (let i = 0; i < firstNonWhiteSpaceCharacter; i++) {
            whiteSpacesSelectedText += ' ';
        }
        let whiteSpacesInProcedure = '';
        for (let i = 0; i < 8; i++) {
            whiteSpacesInProcedure += ' ';
        }
        let splitBy: string = DocumentUtils.getEolByTextDocument(document);
        selectedText = selectedText.replace(new RegExp(splitBy + whiteSpacesSelectedText, 'g'), splitBy + whiteSpacesInProcedure);
        return selectedText;
    }
}

