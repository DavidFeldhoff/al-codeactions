import * as vscode from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTreeExt } from '../AL Code Outline Ext/syntaxTreeExt';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALVariable } from "../Entities/alVariable";
import { DocumentUtils } from '../Utils/documentUtils';
import { Err } from '../Utils/Err';
import { TypeDetective } from '../Utils/typeDetective';

export class ALParameterParser {
    public static parseALVariableArrayToParameterDeclarationString(variableArray: ALVariable[]): string {
        let parameterString = '';
        for (let i = 0; i < variableArray.length; i++) {
            if (parameterString !== "") {
                parameterString += '; ';
            }
            parameterString += variableArray[i].getVariableDeclarationString();
        }
        return parameterString;
    }
    static async parseParameterTreeNodeToALVariable(document: vscode.TextDocument, parameterTreeNode: ALFullSyntaxTreeNode, modifyVarName: boolean): Promise<ALVariable> {
        if (!parameterTreeNode.kind || parameterTreeNode.kind !== FullSyntaxTreeNodeKind.getParameter()) {
            Err._throw('That\'s not a parameter tree node.');
        }
        if (parameterTreeNode.childNodes) {
            let identifierTreeNode: ALFullSyntaxTreeNode = parameterTreeNode.childNodes[0];
            let rangeOfName: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let identifierName = document.getText(rangeOfName);
            let typeTreeNode: ALFullSyntaxTreeNode = parameterTreeNode.childNodes[1];
            let rangeOfType: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(typeTreeNode.fullSpan));
            let type = document.getText(rangeOfType);
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, rangeOfType.start);
            let rangeOfFullDeclaration: vscode.Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(parameterTreeNode.fullSpan));
            let isVar: boolean = document.getText(rangeOfFullDeclaration).toLowerCase().startsWith('var');
            let variable: ALVariable = new ALVariable(identifierName, type, methodOrTriggerTreeNode?.name, isVar);
            if (modifyVarName)
                variable.sanitizeName();
            return variable;
        } else {
            Err._throw('Variable declaration has no child nodes.');
        }
    }
    public static async createALVariableArrayOutOfArgumentListTreeNode(argumentListTreeNode: ALFullSyntaxTreeNode, document: vscode.TextDocument, modifyVarNames: boolean): Promise<ALVariable[]> {
        let variables: ALVariable[] = [];
        if (!argumentListTreeNode.childNodes) {
            return variables;
        }

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getMethodOrTriggerTreeNodeOfCurrentPosition(syntaxTree, TextRangeExt.createVSCodeRange(argumentListTreeNode.fullSpan).start);
        for (let i = 0; i < argumentListTreeNode.childNodes.length; i++) {
            let typeDetective: TypeDetective = new TypeDetective(document, argumentListTreeNode.childNodes[i]);
            await typeDetective.analyzeTypeOfTreeNode();
            let type: string = typeDetective.getType();
            let name: string = typeDetective.getName();
            let isVar: boolean = typeDetective.getIsVar() || typeDetective.getIsTemporary();
            let variable: ALVariable = new ALVariable(name, type, methodOrTriggerTreeNode?.name, isVar);
            if (modifyVarNames)
                variable.sanitizeName();
            variable = ALParameterParser.getUniqueVariableName(variables, variable);
            variables.push(variable);
        }

        return variables;
    }
    public static async createParametersOutOfArgumentListTreeNode(document: vscode.TextDocument, argumentListTreeNode: ALFullSyntaxTreeNode, procedureNameToCreate: string, modifyVarNames: boolean): Promise<ALVariable[]> {
        let parameters = await ALParameterParser.createALVariableArrayOutOfArgumentListTreeNode(argumentListTreeNode, document, modifyVarNames);
        parameters.forEach(parameter => {
            parameter.isLocal = true;
            parameter.procedure = procedureNameToCreate;
        });
        return parameters;
    }

    static async getArgumentRangeArrayOutOfArgumentListRange(document: vscode.TextDocument, rangeOfParameterCall: vscode.Range): Promise<vscode.Range[]> {
        let vscodeRangeArr: vscode.Range[] = [];
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let invocationExpression: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(rangeOfParameterCall.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
        if (invocationExpression) {
            let argumentListTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationExpression, FullSyntaxTreeNodeKind.getArgumentList(), false);
            if (argumentListTreeNode && argumentListTreeNode.childNodes) {
                argumentListTreeNode.childNodes.forEach(argumentTreeNode => {
                    vscodeRangeArr.push(TextRangeExt.createVSCodeRange(argumentTreeNode.fullSpan));
                });
            }
        }
        return vscodeRangeArr;
    }

    public static getUniqueVariableName(variables: ALVariable[], newVariable: ALVariable): ALVariable {
        if (this.existsVariableNameWithNumber(variables, newVariable.name)) {
            for (let i = 1; true; i++) {
                let newVariableNameWithNumber = this.addNumberToVariableName(newVariable.name, i);
                if (!this.existsVariableName(variables, newVariableNameWithNumber)) {
                    newVariable.name = newVariableNameWithNumber;
                    return newVariable;
                }
            }
        } else {
            if (this.existsVariableName(variables, newVariable.name)) {
                let existingVariable = variables.find(v => v.name === newVariable.name) as ALVariable;
                existingVariable.name = this.addNumberToVariableName(existingVariable.name, 1);
                newVariable.name = this.addNumberToVariableName(newVariable.name, 2);
                return newVariable;
            } else {
                return newVariable;
            }
        }
    }
    private static existsVariableName(variables: ALVariable[], variableName: string): boolean {
        let existingVariable = variables.find(v => v.name === variableName);
        return existingVariable !== undefined;
    }
    static existsVariableNameWithNumber(variables: ALVariable[], variableName: string) {
        variableName = this.addNumberToVariableName(variableName);
        let existingVariable = variables.find(v => v.name === variableName);
        return existingVariable !== undefined;
    }
    private static addNumberToVariableName(variableName: string, number?: number): string {
        if (!number) {
            number = 1;
        }
        if (variableName.endsWith('"')) {
            variableName = variableName.substr(0, variableName.length - 1) + number.toString() + '"';
        } else {
            variableName = variableName + number.toString();
        }
        return variableName;
    }
}