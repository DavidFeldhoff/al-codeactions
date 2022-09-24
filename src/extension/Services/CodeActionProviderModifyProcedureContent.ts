import { CodeAction, Diagnostic, Location, Position, Range, TextDocument, TextEdit, window, workspace, WorkspaceEdit } from "vscode";
import * as vscode from 'vscode';
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { CreateProcedureCommands } from "../Create Procedure/CreateProcedureCommands";
import { CreateProcedureAL0118IntegrationEvent } from "../Create Procedure/Procedure Creator/CreateProcedureAL0118IntegrationEvent";
import { ALProcedure } from "../Entities/alProcedure";
import { ALVariable } from "../Entities/alVariable";
import { Command } from "../Entities/Command";
import { ALParameterParser } from "../Entity Parser/alParameterParser";
import { ALVariableParser } from "../Entity Parser/alVariableParser";
import { DocumentUtils } from "../Utils/documentUtils";
import { TypeDetective } from "../Utils/typeDetective";
import { WorkspaceEditUtils } from "../Utils/WorkspaceEditUtils";
import { Config } from "../Utils/config";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { ALVariableHandler } from "../Utils/alVariableHandler";
import * as Telemetry from "../ApplicationInsights/applicationInsights";

export class CodeActionProviderModifyProcedureContent {
    document: TextDocument;
    range: Range;

    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(): Promise<boolean> {
        if (this.range.start.line != this.range.end.line)
            return false;
        let currentLine: string = this.document.lineAt(this.range.start.line).text;
        let regex: RegExp = /^(\s+(?:local|internal|protected|public)? (procedure|trigger) )(\w+|"[^"]+")\(/i;
        if (!regex.test(currentLine))
            return false;
        let regexArr: RegExpExecArray | null = regex.exec(currentLine);
        if (this.range.start.character < regexArr![1].length)
            return false;
        if (this.range.start.character > regexArr![1].length + regexArr![2].length)
            return false;
        return true;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        let sourceSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let methodOrTriggerNode: ALFullSyntaxTreeNode | undefined = sourceSyntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (!methodOrTriggerNode)
            return [];
        let eventNodes: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(methodOrTriggerNode, [FullSyntaxTreeNodeKind.getMemberAttribute()], false);
        if (eventNodes.some((eventNode) => eventNode.identifier && eventNode.identifier.toLowerCase() in ['integrationevent', 'businessevent', 'internalevent']))
            return [];
        let identifierNameSanitized: string | undefined = ALFullSyntaxTreeNodeExt.getIdentifierValue(this.document, methodOrTriggerNode, true);
        if (!identifierNameSanitized)
            return []
        identifierNameSanitized = identifierNameSanitized.substr(0, 1).toUpperCase() + identifierNameSanitized.substr(1);
        let methodOrTriggerRange: Range = TextRangeExt.createVSCodeRange(methodOrTriggerNode.fullSpan);
        let onBeforePublisherName: string = 'OnBefore' + identifierNameSanitized;
        let onAfterPublisherName: string = 'OnAfter' + identifierNameSanitized;
        let createOnBeforeCodeAction: boolean = !this.document.getText(methodOrTriggerRange).includes(onBeforePublisherName + '(');
        let createOnAfterCodeAction: boolean = !this.document.getText(methodOrTriggerRange).includes(onAfterPublisherName + '(');
        if (!createOnBeforeCodeAction && !createOnAfterCodeAction)
            return [];
        let sourceLocation = new Location(this.document.uri, this.range);
        let codeActions: CodeAction[] = [];
        if (createOnBeforeCodeAction)
            codeActions.push({
                title: 'Add OnBefore Publisher',
                command: { command: Command.modifyProcedureContent, arguments: [this.document, this.range, PublisherToAdd.OnBefore, sourceLocation, { suppressUI: false }], title: 'Create Publisher' },
                kind: vscode.CodeActionKind.QuickFix
            });
        if (createOnAfterCodeAction)
            codeActions.push({
                title: 'Add OnAfter Publisher',
                command: { command: Command.modifyProcedureContent, arguments: [this.document, this.range, PublisherToAdd.OnAfter, sourceLocation, { suppressUI: false }], title: 'Create Publisher' },
                kind: vscode.CodeActionKind.QuickFix
            });

        return codeActions;
    }
    async executeCommand(publisherToAdd: PublisherToAdd, sourceLocation: Location, options: { suppressUI: boolean }): Promise<void> {
        let appInsightsEntryProperties: any = {};
        let workspaceEdit: WorkspaceEdit | undefined = await this.getWorkspaceEditComplete(publisherToAdd, sourceLocation, options.suppressUI, appInsightsEntryProperties);
        if (workspaceEdit) {
            Telemetry.trackEvent(Telemetry.EventName.AddPublisher, appInsightsEntryProperties);
            await WorkspaceEditUtils.applyWorkspaceEditWithoutUndoStack(workspaceEdit)
        }
    }
    async getWorkspaceEditComplete(publisherToAdd: PublisherToAdd, sourceLocation: Location, suppressUI: boolean, appInsightsEntryProperties: any, vscodeInstance: any = vscode): Promise<WorkspaceEdit | undefined> {
        appInsightsEntryProperties.publisherToAdd = publisherToAdd.toString();
        let sourceSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let methodOrTriggerNode: ALFullSyntaxTreeNode | undefined = sourceSyntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        if (!methodOrTriggerNode)
            return
        let identifierNameSanitized: string | undefined = ALFullSyntaxTreeNodeExt.getIdentifierValue(this.document, methodOrTriggerNode, true);
        if (!identifierNameSanitized)
            return
        identifierNameSanitized = identifierNameSanitized.substring(0, 1).toUpperCase() + identifierNameSanitized.substring(1);
        let parameterList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerNode, FullSyntaxTreeNodeKind.getParameterList(), false);
        if (!parameterList)
            return;
        let parameters: ALVariable[] = [];
        if (parameterList.childNodes)
            for (const parameterNode of parameterList.childNodes)
                parameters.push(await ALParameterParser.parseParameterTreeNodeToALVariable(this.document, parameterNode, true));

        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        let variableNodes: ALFullSyntaxTreeNode[] = [];
        if (varSection)
            variableNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(varSection, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableDeclarationName()], true);
        let localVariables: ALVariable[] = ALVariableParser.parseVariableTreeNodeArrayToALVariableArray(this.document, variableNodes, false);
        let globalVarSections = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(methodOrTriggerNode.parentNode!, [FullSyntaxTreeNodeKind.getGlobalVarSection()], false);
        let globalVariableNodes: ALFullSyntaxTreeNode[] = [];
        if (globalVarSections)
            for (const globalVarSection of globalVarSections)
                globalVariableNodes = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(globalVarSection, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableDeclarationName()], true);
        let globalVariables: ALVariable[] = ALVariableParser.parseVariableTreeNodeArrayToALVariableArray(this.document, globalVariableNodes, false);
        let returnNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerNode, FullSyntaxTreeNodeKind.getReturnValue(), false);
        let returnVariable: ALVariable | undefined = undefined;
        if (returnNode) {
            returnVariable = await ALVariableParser.parseReturnValueTreeNodeToALVariable(this.document, returnNode, false);
            returnVariable.isVar = true;
        }
        let blockNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerNode, FullSyntaxTreeNodeKind.getBlock(), false);
        if (!blockNode)
            return
        let lastExitStatementData: { rangeOfExitStatement: Range; variable: ALVariable | undefined; exitContent: string; } | undefined = await this.getVariableOfLastExitStatement(blockNode);
        let recAndXRecVariables: { rec: ALVariable | undefined; xRec: ALVariable | undefined } = await this.getRecAndXRecVariables(SyntaxTreeExt.getObjectTreeNode(sourceSyntaxTree, this.range.start), this.range)
        let workspaceEdit = new WorkspaceEdit();
        let rangeOfBlockNode: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(blockNode.fullSpan));
        let publisherName: string;
        let selection: ALVariable[] | undefined;
        switch (publisherToAdd) {
            case PublisherToAdd.OnBefore:
                publisherName = 'OnBefore' + identifierNameSanitized;
                selection = await this.getWorkspaceEditForOnBeforePublisher(localVariables, parameters, returnVariable, globalVariables, recAndXRecVariables, methodOrTriggerNode, workspaceEdit, rangeOfBlockNode, publisherName, suppressUI, vscodeInstance);
                break;
            case PublisherToAdd.OnAfter:
                publisherName = 'OnAfter' + identifierNameSanitized;
                selection = await this.getWorkspaceEditForOnAfterPublisher(rangeOfBlockNode, methodOrTriggerNode, localVariables, parameters, returnVariable, lastExitStatementData, globalVariables, recAndXRecVariables, publisherName, suppressUI, workspaceEdit, vscodeInstance);
                break;
        }
        if (!selection)
            return undefined;
        let publisherParameters: ALVariable[] = selection;
        let procedure: ALProcedure = await this.getProcedureToCreate(rangeOfBlockNode, publisherName, publisherParameters);

        let edits = await CreateProcedureCommands.getEditToAddProcedureToSourceCode(this.document, procedure, sourceLocation, { advancedProcedureCreation: false, suppressUI: suppressUI }, appInsightsEntryProperties);
        if (edits && edits.workspaceEdit) {
            for (const entry of edits.workspaceEdit.entries()) {
                for (const textEditEntry of entry[1])
                    workspaceEdit.insert(entry[0], textEditEntry.range.start, textEditEntry.newText);
            }
        }
        return workspaceEdit;
    }
    async getRecAndXRecVariables(objectTreeNode: ALFullSyntaxTreeNode | undefined, range: Range): Promise<{ rec: ALVariable | undefined; xRec: ALVariable | undefined; }> {
        let returnVar: { rec: ALVariable | undefined, xRec: ALVariable | undefined } = { rec: undefined, xRec: undefined };
        if (!objectTreeNode)
            return returnVar
        returnVar = ALVariableHandler.getRecAndXRecAsALVariable(objectTreeNode, this.document, range)
        if (returnVar.rec || returnVar.xRec) {
            let availableVariables = await ALVariableHandler.getAvailableVariablesInRange(this.document, objectTreeNode, range);
            if (returnVar.rec)
                if (availableVariables.some(variable => variable.getNameOrEmpty().toLowerCase() == 'rec' && variable.type != returnVar.rec!.type))
                    returnVar.rec = undefined
                else
                    returnVar.rec.isVar = true;
            if (returnVar.xRec)
                if (availableVariables.some(variable => variable.getNameOrEmpty().toLowerCase() == 'xrec' && variable.type != returnVar.xRec!.type))
                    returnVar.xRec = undefined
                else
                    returnVar.xRec.isVar = true;
        }
        return returnVar;
    }
    async getVariableOfLastExitStatement(blockNode: ALFullSyntaxTreeNode): Promise<{ rangeOfExitStatement: Range; variable: ALVariable | undefined; exitContent: string; } | undefined> {
        if (blockNode.childNodes && blockNode.childNodes[blockNode.childNodes.length - 1].kind == FullSyntaxTreeNodeKind.getExitStatement()) {
            let exitNode: ALFullSyntaxTreeNode = blockNode.childNodes[blockNode.childNodes.length - 1];
            if (exitNode.childNodes) {
                if (exitNode.childNodes.length == 1) {
                    let rangeOfExitStatement: Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(exitNode.fullSpan));
                    let exitContent: string = this.document.getText(DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(exitNode.childNodes[0].fullSpan)));
                    let variable: ALVariable | undefined;
                    let nodeToCheck: ALFullSyntaxTreeNode = exitNode.childNodes[0];
                    if (exitNode.childNodes[0].kind == FullSyntaxTreeNodeKind.getMemberAccessExpression())
                        nodeToCheck = exitNode.childNodes[0].childNodes![0];
                    let typeDetective: TypeDetective = new TypeDetective(this.document, nodeToCheck);
                    await typeDetective.analyzeTypeOfTreeNode();
                    if (typeDetective.getCanBeVar()) {
                        variable = new ALVariable(typeDetective.getName(), typeDetective.getType(), undefined, true);
                    }
                    return { rangeOfExitStatement, variable, exitContent };
                }
            }
        }
        return undefined;
    }
    async getWorkspaceEditForOnBeforePublisher(localVariables: ALVariable[], parameters: ALVariable[], returnVariable: ALVariable | undefined, globalVariables: ALVariable[], recAndXRecVariables: { rec: ALVariable | undefined; xRec: ALVariable | undefined }, methodOrTriggerNode: ALFullSyntaxTreeNode, workspaceEdit: WorkspaceEdit, rangeOfBlockNode: Range, publisherName: string, suppressUI: boolean, vscodeInstance: any = vscode): Promise<ALVariable[] | undefined> {
        let possibleParameters: { reason: string, variable: ALVariable, pickDefault: boolean, parameterPositionPrio: number }[] = []
        let isHandledVariable: ALVariable = new ALVariable('IsHandled', 'Boolean', undefined, true);
        let isHandledExists: boolean = localVariables.some((variable) => variable.getNameOrEmpty().toLowerCase() == isHandledVariable.getNameOrEmpty().toLowerCase());

        possibleParameters.push({ reason: 'IsHandled', variable: isHandledVariable, pickDefault: true, parameterPositionPrio: 100 });
        if (returnVariable) {
            if (!returnVariable.name) {
                let returnNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerNode, FullSyntaxTreeNodeKind.getReturnValue(), false)!;
                returnVariable.name = await this.askForReturnVariableName(localVariables, parameters, globalVariables, suppressUI, vscodeInstance);
                if (returnVariable.name === undefined)
                    return undefined;
                if (returnVariable.name)
                    workspaceEdit.insert(this.document.uri, TextRangeExt.createVSCodeRange(returnNode!.fullSpan).start, ' ' + returnVariable.name);
            }
            if (returnVariable.name)
                if (!possibleParameters.some((possibleparam) => possibleparam.variable.name == returnVariable.name))
                    possibleParameters.push({ reason: 'return variable', variable: returnVariable, pickDefault: true, parameterPositionPrio: 90 });
        }
        if (recAndXRecVariables.rec)
            possibleParameters.push({ reason: 'Rec', variable: recAndXRecVariables.rec, pickDefault: false, parameterPositionPrio: 60 })
        if (recAndXRecVariables.xRec)
            possibleParameters.push({ reason: 'xRec', variable: recAndXRecVariables.xRec, pickDefault: false, parameterPositionPrio: 60 })
        for (const parameter of parameters)
            if (!possibleParameters.some((possibleparameter) => possibleparameter.variable.name == parameter.name))
                possibleParameters.push({ reason: 'parameter', variable: parameter, pickDefault: true, parameterPositionPrio: 80 });
        for (const localVariable of localVariables)
            if (!possibleParameters.some((possibleparameter) => possibleparameter.variable.name == localVariable.name))
                possibleParameters.push({ reason: 'local variable', variable: localVariable, pickDefault: false, parameterPositionPrio: 70 });
        for (let i = 0; i < possibleParameters.length; i++)
            possibleParameters[i].variable = ALParameterParser.enhanceParametersToVarParameters(this.document, [possibleParameters[i].variable], publisherName, Config.getPublisherHasVarParametersOnly(this.document.uri)).pop()!
        let selection: ALVariable[] | undefined = await this.selectParameters(possibleParameters, suppressUI, vscodeInstance);
        if (!selection)
            return undefined;
        let publisherParameters: ALVariable[] = selection;
        let isHandledSelected: boolean = publisherParameters.some(publisherParameter => publisherParameter.name == 'IsHandled')
        if (!isHandledExists && isHandledSelected) {
            let textEdit: TextEdit = WorkspaceEditUtils.addVariableToLocalVarSection(methodOrTriggerNode, isHandledVariable, this.document);
            workspaceEdit.insert(this.document.uri, textEdit.range.start, textEdit.newText);
        }
        let indent: string = "".padStart(rangeOfBlockNode.start.character + 4, " ");
        let textToInsert: string = ""
        if (isHandledSelected)
            textToInsert += `IsHandled := false;\r\n${indent}`;
        textToInsert += `${publisherName}(${publisherParameters.map((param: { getNameOrEmpty: () => any; }) => param.getNameOrEmpty()).join(', ')});\r\n${indent}`;
        if (isHandledSelected)
            textToInsert += `if IsHandled then\r\n${indent}    exit;\r\n${indent}`;
        let insertAt: Position = rangeOfBlockNode.start.translate(1, 4)
        if (rangeOfBlockNode.start.line + 1 == rangeOfBlockNode.end.line) {
            textToInsert = ''.padStart(4, ' ') + textToInsert + '\r\n' + "".padStart(rangeOfBlockNode.start.character, " ")
            insertAt = rangeOfBlockNode.start.translate(1, 0);
        }
        else if (!this.document.lineAt(rangeOfBlockNode.start.line + 1).isEmptyOrWhitespace) {
            textToInsert += `\r\n${indent}`
        }
        workspaceEdit.insert(this.document.uri, insertAt, textToInsert);
        return publisherParameters;
    }
    async getWorkspaceEditForOnAfterPublisher(rangeOfBlockNode: Range, methodOrTriggerNode: ALFullSyntaxTreeNode, localVariables: ALVariable[], parameters: ALVariable[], returnVariable: ALVariable | undefined, lastExitStatementData: { rangeOfExitStatement: Range; variable: ALVariable | undefined; exitContent: string; } | undefined, globalVariables: ALVariable[], recAndXRecVariables: { rec: ALVariable | undefined; xRec: ALVariable | undefined }, onAfterPublisherName: string, suppressUI: boolean, onAfterWorkspaceEdit: WorkspaceEdit, vscodeInstance: any) {
        let possibleParameters: { reason: string, variable: ALVariable, pickDefault: boolean, parameterPositionPrio: number }[] = []
        if (lastExitStatementData && lastExitStatementData.variable) {
            let reason: string = 'used in exit statement';
            if (returnVariable && returnVariable.name == lastExitStatementData.variable.name) {
                reason += ' + return variable';
            }
            else if (parameters.some((parameter: { name: any; }) => parameter.name == lastExitStatementData.variable!.name)) {
                reason += ' + parameter';
            }
            else if (localVariables.some((localVariable: { name: any; }) => localVariable.name == lastExitStatementData.variable!.name)) {
                reason += ' + local variable';
            }
            possibleParameters.push({ reason: reason, variable: lastExitStatementData.variable, pickDefault: true, parameterPositionPrio: 100 });
        }
        if (returnVariable) {
            let returnVariableIsRequiredButMissing: boolean = !returnVariable.name && !lastExitStatementData;
            if (returnVariableIsRequiredButMissing) {
                let returnNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerNode, FullSyntaxTreeNodeKind.getReturnValue(), false);
                returnVariable.name = await this.askForReturnVariableName(localVariables, parameters, globalVariables, suppressUI, vscodeInstance);
                if (returnVariable.name === undefined)
                    return undefined;
                if (returnVariable.name)
                    onAfterWorkspaceEdit.insert(this.document.uri, TextRangeExt.createVSCodeRange(returnNode!.fullSpan).start, ' ' + returnVariable.name);
            }
            if (returnVariable.name)
                if (!possibleParameters.some((possibleparam) => possibleparam.variable.name == returnVariable.name))
                    possibleParameters.push({ reason: 'return variable', variable: returnVariable, pickDefault: !lastExitStatementData, parameterPositionPrio: 90 });
        }
        if (recAndXRecVariables.rec)
            possibleParameters.push({ reason: 'Rec', variable: recAndXRecVariables.rec, pickDefault: false, parameterPositionPrio: 60 })
        if (recAndXRecVariables.xRec)
            possibleParameters.push({ reason: 'xRec', variable: recAndXRecVariables.xRec, pickDefault: false, parameterPositionPrio: 60 })
        for (const parameter of parameters)
            if (!possibleParameters.some((possibleparameter) => possibleparameter.variable.name == parameter.name))
                possibleParameters.push({ reason: 'parameter', variable: parameter, pickDefault: true, parameterPositionPrio: 80 });
        for (const localVariable of localVariables)
            if (!possibleParameters.some((possibleparameter) => possibleparameter.variable.name == localVariable.name))
                possibleParameters.push({ reason: 'local variable', variable: localVariable, pickDefault: false, parameterPositionPrio: 70 });
        for (let i = 0; i < possibleParameters.length; i++)
            possibleParameters[i].variable = ALParameterParser.enhanceParametersToVarParameters(this.document, [possibleParameters[i].variable], onAfterPublisherName, Config.getPublisherHasVarParametersOnly(this.document.uri)).pop()!
        let selection: ALVariable[] | undefined = await this.selectParameters(possibleParameters, suppressUI, vscodeInstance);
        if (!selection)
            return undefined;
        let publisherParameters: ALVariable[] = selection;
        let data: { addAtPosition: Position; addTab: boolean; indentAfterwards: number } = this.getFormatDataToInsertText(lastExitStatementData, rangeOfBlockNode);
        let indent = "".padStart(data.addAtPosition.character, " ");
        let textToInsert: string = "";
        if (data.addTab)
            textToInsert += "".padStart(4, " ");
        indent += textToInsert;
        if (!this.document.lineAt(data.addAtPosition.line - 1).isEmptyOrWhitespace)
            textToInsert += `\r\n${indent}`
        textToInsert += `${onAfterPublisherName}(${publisherParameters.map((param: { getNameOrEmpty: () => any; }) => param.getNameOrEmpty()).join(', ')});\r\n${"".padStart(data.indentAfterwards, " ")}`;
        onAfterWorkspaceEdit.insert(this.document.uri, data.addAtPosition, textToInsert);
        return publisherParameters;
    }
    async askForReturnVariableName(localVariables: any[], parameters: any[], globalVariables: any[], suppressUI: boolean, vscodeInstance: any = vscode): Promise<string | undefined> {
        if (suppressUI)
            return 'returnVar'
        return await vscodeInstance.window.showInputBox({
            placeHolder: 'returnVar',
            prompt: 'Please specify a name for the return variable.',
            validateInput: (value: string) => {
                if (localVariables.some((localVariable) => localVariable.name.toLowerCase() == value.toLowerCase()))
                    return 'Already declared as local variable.';
                if (parameters.some((parameter) => parameter.name.toLowerCase() == value.toLowerCase()))
                    return 'Already declared as parameter.';
                if (globalVariables.some((globalVariable) => globalVariable.name.toLowerCase() == value.toLowerCase()))
                    return 'Already declared as global variable.';
                return undefined;
            }
        });
    }
    getFormatDataToInsertText(lastExitStatementData: { rangeOfExitStatement: Range; variable: ALVariable | undefined; exitContent: string; } | undefined, rangeOfBlockNode: Range): { addAtPosition: Position; addTab: boolean; indentAfterwards: number; } {
        if (lastExitStatementData) {
            return {
                addAtPosition: lastExitStatementData.rangeOfExitStatement.start,
                addTab: false,
                indentAfterwards: this.document.lineAt(lastExitStatementData.rangeOfExitStatement.start.line).firstNonWhitespaceCharacterIndex
            };
        }
        else {
            return {
                addAtPosition: rangeOfBlockNode.end.translate(0, -4),
                addTab: true,
                indentAfterwards: this.document.lineAt(rangeOfBlockNode.end.line).firstNonWhitespaceCharacterIndex
            };
        }
    }
    async selectParameters(possibleParameters: { reason: string, variable: ALVariable, pickDefault: boolean, parameterPositionPrio: number }[], suppressUI: boolean, vscodeInstance: any): Promise<ALVariable[] | undefined> {
        if (possibleParameters.length == 0)
            return []

        interface MyQuickPickItem { label: string, description?: string, detail?: string, picked?: boolean, alwaysShow?: boolean; variable: ALVariable, parameterPositionPrio: number }
        let quickPickItems: MyQuickPickItem[] = possibleParameters.map((entry) => {
            return {
                label: entry.variable.name!,
                picked: entry.pickDefault,
                description: `${entry.variable.type}, var: ${entry.variable.isVar}, reason: ${entry.reason}`,
                variable: entry.variable,
                parameterPositionPrio: entry.parameterPositionPrio
            };
        });
        let answer: MyQuickPickItem[] | undefined
        if (suppressUI)
            answer = quickPickItems.filter((item) => item.picked)
        else
            answer = await vscodeInstance.window.showQuickPick(quickPickItems, { canPickMany: true, placeHolder: "Select parameters to add" });
        if (!answer)
            return undefined;
        else
            return answer.sort((one, two) => one.parameterPositionPrio - two.parameterPositionPrio).map((entry) => entry.variable);
    }
    async getProcedureToCreate(rangeOfBlockNode: any, publisherName: any, publisherParameters: any): Promise<ALProcedure> {
        let createProcedureAL0118IntegrationEvent = new CreateProcedureAL0118IntegrationEvent(this.document, new Diagnostic(rangeOfBlockNode, 'dummy'));
        await createProcedureAL0118IntegrationEvent.initialize();
        let procedure: ALProcedure = new ALProcedure(publisherName, publisherParameters, await createProcedureAL0118IntegrationEvent.getVariables(), await createProcedureAL0118IntegrationEvent.getReturnType(), createProcedureAL0118IntegrationEvent.getAccessModifier(), createProcedureAL0118IntegrationEvent.getMemberAttributes(), createProcedureAL0118IntegrationEvent.getJumpToCreatedProcedure(), createProcedureAL0118IntegrationEvent.containsSnippet(), await createProcedureAL0118IntegrationEvent.getObject(), await createProcedureAL0118IntegrationEvent.isReturnTypeRequired());
        return procedure;
    }
}
export enum PublisherToAdd {
    OnBefore,
    OnAfter
}