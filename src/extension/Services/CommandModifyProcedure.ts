import { Position, Range, TextDocument, TextEdit, window, workspace, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import * as Telemetry from "../ApplicationInsights/applicationInsights";
import { ALVariable } from "../Entities/alVariable";
import { ALVariableParser } from "../Entity Parser/alVariableParser";
import { DocumentUtils } from "../Utils/documentUtils";
import { WorkspaceUtils } from "../Utils/workspaceUtils";

export class CommandModifyProcedure {
    static async addParametersToProcedure(document: TextDocument, methodNode: ALFullSyntaxTreeNode, missingParameters: ALVariable[]) {
        let textEdits: TextEdit[] | undefined = this.getTextEditsToAddParametersToProcedure(document, methodNode, missingParameters);
        if (textEdits) {
            let edit = new WorkspaceEdit();
            edit.set(document.uri, textEdits)
            Telemetry.trackEvent(Telemetry.EventName.AddParameter, {})
            await workspace.applyEdit(edit);
        }
    }
    static getTextEditsToAddParametersToProcedure(document: TextDocument, methodNode: ALFullSyntaxTreeNode, missingParameters: ALVariable[]): TextEdit[] | undefined {
        let parameterList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodNode, FullSyntaxTreeNodeKind.getParameterList(), false)
        if (!parameterList)
            return
        let parameterListRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(parameterList.fullSpan))
        let parameters: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(parameterList, [FullSyntaxTreeNodeKind.getParameter()], false)
        let textToAdd: string = ''
        let startPos: Position
        if (parameters.length == 0)
            startPos = parameterListRange.start.translate(0, 1)
        else {
            startPos = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(parameters.pop()!.fullSpan)).end
            textToAdd += '; '
        }
        for (let i = 0; i < missingParameters.length; i++) {
            textToAdd += missingParameters[i].getParameterDeclarationString()
            if (i + 1 != missingParameters.length)
                textToAdd += '; '
        }
        return [
            new TextEdit(new Range(startPos, startPos), textToAdd)
        ]
    }
    static async createOverloadOfProcedure(document: TextDocument, methodNode: ALFullSyntaxTreeNode, missingParameters: ALVariable[]) {
        let appInsightsEntryProperties: any = {};
        let userAnswer: string | undefined = await window.showQuickPick(['No', 'Yes'], { placeHolder: 'Obsolete old one?' })
        if (!userAnswer)
            return
        let obsoleteOldOne: boolean = userAnswer == 'Yes'
        let textEdits: TextEdit[] | undefined = await this.getTextEditsToCreateOverloadOfProcedure(document, methodNode, missingParameters, obsoleteOldOne)
        if (textEdits) {
            let edit: WorkspaceEdit = new WorkspaceEdit();
            edit.set(document.uri, textEdits)
            appInsightsEntryProperties.obsoleteOldOne = obsoleteOldOne
            Telemetry.trackEvent(Telemetry.EventName.CreateProcedureOverload, appInsightsEntryProperties);
            await workspace.applyEdit(edit)
        }
    }
    static async getTextEditsToCreateOverloadOfProcedure(document: TextDocument, methodNode: ALFullSyntaxTreeNode, missingParameters: ALVariable[], obsoleteOldOne: Boolean): Promise<TextEdit[] | undefined> {
        let methodName: string = ALFullSyntaxTreeNodeExt.getIdentifierValue(document, methodNode, false)!;
        let parameterList: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(methodNode, [FullSyntaxTreeNodeKind.getParameterList()], false).pop()!
        let parameterIdentifiers: string[] | undefined = parameterList.childNodes?.map(parameterNode => ALFullSyntaxTreeNodeExt.getIdentifierValue(document, parameterNode, false)!)
        if (!parameterIdentifiers)
            parameterIdentifiers = []

        let methodRange: Range = TextRangeExt.createVSCodeRange(methodNode.fullSpan);
        let endNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(methodNode, [FullSyntaxTreeNodeKind.getVarSection(), FullSyntaxTreeNodeKind.getBlock()], false).shift()
        if (!endNode)
            return

        let returnValue: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodNode, FullSyntaxTreeNodeKind.getReturnValue(), false)
        let returnVariable: { name: string | undefined, exists: boolean } = { name: undefined, exists: false }
        if (returnValue && returnValue.childNodes) {
            if (returnValue.childNodes.length == 1)
                returnVariable = { exists: true, name: undefined }
            else
                returnVariable = { exists: true, name: document.getText(TextRangeExt.createVSCodeRange(returnValue.childNodes[0].fullSpan)).trim() }
        }

        let rangeToCopy: Range = DocumentUtils.trimRange(document, new Range(methodRange.start, TextRangeExt.createVSCodeRange(endNode.fullSpan).start));
        let indent = document.lineAt(endNode.fullSpan!.start!.line).firstNonWhitespaceCharacterIndex;
        let indentText = ''.padStart(indent, ' ')
        let tab = ''.padStart(4, ' ');
        let textToAdd: string = ''
        if (obsoleteOldOne) {
            let json: any | undefined = await WorkspaceUtils.findAppJson(document.uri)
            let obsoletedInVersion = ''
            if (json && json.version)
                obsoletedInVersion = `v${json.version}`
            textToAdd += `\r\n${indentText}[Obsolete('Please use the overload with ${parameterIdentifiers.length + missingParameters.length} parameters.', '${obsoletedInVersion}')]`
        }
        textToAdd += '\r\n' + indentText + document.getText(rangeToCopy);
        textToAdd += '\r\n'
        let varSectionAdded: boolean = false;
        for (const missingParameter of missingParameters) {
            if (!CommandModifyProcedure.isVariableDeclarationNecessary(missingParameter))
                parameterIdentifiers.push(CommandModifyProcedure.getDefaultValueOfVariable(missingParameter)!);
            else {
                if (!varSectionAdded) {
                    textToAdd += indentText + 'var\r\n';
                    varSectionAdded = true
                }
                textToAdd += indentText + tab + missingParameter.getVariableDeclarationString() + ';\r\n'
                parameterIdentifiers.push(missingParameter.getNameOrEmpty())
            }
        }
        textToAdd += indentText + 'begin\r\n';

        let methodCall: string = methodName + '(' + parameterIdentifiers.join(', ') + ')';
        if (returnVariable.exists) {
            if (!returnVariable.name)
                textToAdd += indentText + tab + 'exit(' + methodCall + ')' + ';\r\n';
            else
                textToAdd += indentText + tab + returnVariable.name + ' := ' + methodCall + ';\r\n';
        } else
            textToAdd += indentText + tab + methodCall + ';\r\n';
        textToAdd += indentText + 'end;\r\n';

        let textEdits = []
        let textEditsParameter: TextEdit[] | undefined = this.getTextEditsToAddParametersToProcedure(document, methodNode, missingParameters);
        if (textEditsParameter)
            for (const textEdit of textEditsParameter)
                textEdits.push(textEdit)
        textEdits.push(new TextEdit(new Range(methodRange.start, methodRange.start), textToAdd))
        return textEdits
    }

    private static isVariableDeclarationNecessary(missingParameter: ALVariable) {
        if (missingParameter.isVar)
            return true

        if (ALVariableParser.simpleDataTypesAndDefaultValues.has(missingParameter.getTypeShort().toLowerCase()))
            return false
        return true
    }
    private static getDefaultValueOfVariable(missingParameter: ALVariable): string | undefined {
        let type = missingParameter.getTypeShort().toLowerCase()
        return ALVariableParser.simpleDataTypesAndDefaultValues.get(type)
    }
}