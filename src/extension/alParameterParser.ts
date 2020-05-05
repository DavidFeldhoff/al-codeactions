import * as vscode from 'vscode';
import { ALVariable } from "./alVariable";
import { ALVariableHandler } from "./alVariableHandler";
import { ALVariableParser } from './alVariableParser';
import { isUndefined } from 'util';
import { SyntaxTree } from './AL Code Outline/syntaxTree';
import { FullSyntaxTreeNodeKind } from './AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNode } from './AL Code Outline/alFullSyntaxTreeNode';
import { ALFullSyntaxTreeNodeExt } from './AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { TextRangeExt } from './AL Code Outline Ext/textRangeExt';

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
    public static async createALVariableArrayOutOfArgumentListRange(rangeOfArgumentList: vscode.Range, document: vscode.TextDocument): Promise<ALVariable[]> {
        let variables: ALVariable[] = [];
        let callString = document.getText(rangeOfArgumentList);
        if (callString === "") {
            return variables;
        }

        let argumentRanges: vscode.Range[] = await this.getArgumentRangeArrayOutOfArgumentListRange(document, rangeOfArgumentList);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined;
        if (argumentRanges.length > 0) {
            methodOrTriggerTreeNode = syntaxTree.findTreeNode(argumentRanges[0].start, [FullSyntaxTreeNodeKind.getMethodDeclaration(), FullSyntaxTreeNodeKind.getTriggerDeclaration()]);
        }
        for (let i = 0; i < argumentRanges.length; i++) {
            let variable = await ALVariableHandler.getALVariableByName(document, argumentRanges[i]);
            if (isUndefined(variable)) {
                let variableCall = document.getText(argumentRanges[i]); //Customer."No." e.g.
                variable = await ALVariableParser.parseMemberAccessExpressionToALVariableUsingSymbols(document, argumentRanges[i]);
            }
            if (isUndefined(variable)) {
                if (document.getText(argumentRanges[i]).trim().toLowerCase() === 'rec') {
                    variable = await ALVariableHandler.getRecAsALVariable(document);
                }
            }
            if (isUndefined(variable)) {
                variable = ALVariableParser.parsePrimitiveTypes(document, argumentRanges[i]);
            }
            if (isUndefined(variable)) {
                variable = ALParameterParser.createVariantVariable();
            }
            variable = ALParameterParser.getUniqueVariableName(variables, variable);
            variables.push(variable);
        }

        return variables;
    }
    static getArgumentListRangeOfDiagnostic(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.Range {
        let line = document.lineAt(diagnostic.range.start.line).text;
        let chars: string[] = line.split('');

        let inQuotes: boolean = false;
        let bracketDepth: number = 0;
        let parameterStartPos: vscode.Position | undefined;
        for (let i = diagnostic.range.end.character; i < line.length; i++) {
            if (chars[i] === '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes) {
                if (chars[i] === '(') {
                    bracketDepth += 1;
                    if (!parameterStartPos) {
                        parameterStartPos = new vscode.Position(diagnostic.range.start.line, i + 1);
                    }
                } else if (chars[i] === ')') {
                    bracketDepth -= 1;
                    if (bracketDepth === 0) {
                        return new vscode.Range(parameterStartPos as vscode.Position, new vscode.Position(diagnostic.range.start.line, i));
                    }
                }
            }
        }
        throw new Error('Could not find parameters.');
    }
    static async getArgumentRangeArrayOutOfArgumentListRange(document: vscode.TextDocument, rangeOfParameterCall: vscode.Range): Promise<vscode.Range[]> {
        let vscodeRangeArr: vscode.Range[] = [];
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let invocationExpression: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(rangeOfParameterCall.start, [FullSyntaxTreeNodeKind.getInvocationExpression()]);
        if (invocationExpression) {
            let argumentListTreeNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationExpression, FullSyntaxTreeNodeKind.getArgumentList(), false);
            if (argumentListTreeNode && argumentListTreeNode.childNodes) {
                let argumentList: ALFullSyntaxTreeNode[] = [];
                argumentListTreeNode.childNodes.forEach(argumentTreeNode => {
                    vscodeRangeArr.push(TextRangeExt.createVSCodeRange(argumentTreeNode.fullSpan));
                });
            }
        }
        return vscodeRangeArr;
        // let parameterCallString = document.getText(rangeOfParameterCall);
        // let line = document.lineAt(rangeOfParameterCall.start.line).text;

        // let parameters: vscode.Range[] = [];
        // let nextParameterString: string = '';
        // let chars: string[] = line.split('');
        // let bracketDepth: number = 0;
        // let inQuotes: boolean = false;
        // let resetVariable: boolean = false;
        // let startPos: vscode.Position | undefined;
        // let endPos: vscode.Position | undefined;
        // let range: vscode.Range | undefined = document.getWordRangeAtPosition(rangeOfParameterCall.start);

        // for (let i = rangeOfParameterCall.start.character; i < rangeOfParameterCall.end.character; i++) {
        //     if (chars[i] === '"') {
        //         inQuotes = !inQuotes;
        //     }
        //     if (!inQuotes) {
        //         if (chars[i] === '(') {
        //             bracketDepth += 1;
        //         }
        //         if (chars[i] === ')') {
        //             bracketDepth -= 1;
        //         }
        //         if (chars[i] === ',') {
        //             if (bracketDepth === 0) {
        //                 resetVariable = true;
        //                 nextParameterString = nextParameterString.trimRight();
        //                 endPos = new vscode.Position(Number(startPos?.line), Number(startPos?.character) + nextParameterString.length);
        //                 if (nextParameterString.length > 0) {
        //                     parameters.push(new vscode.Range(startPos as vscode.Position, endPos as vscode.Position));
        //                 }
        //             }
        //         }
        //     }

        //     if (nextParameterString !== '' || chars[i] !== ' ') {
        //         nextParameterString += chars[i];
        //         if (!startPos) {
        //             startPos = new vscode.Position(rangeOfParameterCall.start.line, i);
        //         }
        //     }
        //     if (resetVariable) {
        //         resetVariable = false;
        //         nextParameterString = '';
        //         startPos = undefined;
        //         endPos = undefined;
        //     }
        // }
        // nextParameterString = nextParameterString.trimRight();
        // if (nextParameterString.length > 0) {
        //     endPos = new vscode.Position(Number(startPos?.line), Number(startPos?.character) + nextParameterString.length);
        //     parameters.push(new vscode.Range(startPos as vscode.Position, endPos as vscode.Position));
        // }

        // return parameters;
    }

    private static createVariantVariable(): ALVariable {
        return new ALVariable("arg", undefined, false, 'Variant');

    }
    public static getUniqueVariableName(variables: ALVariable[], newVariable: ALVariable): ALVariable {
        if (this.existsVariableNameWithNumber(variables, newVariable.name)) {
            for (let i = 1; true; i++) {
                let newVariableNameWithNumber = this.addNumberToVariableName(variables, newVariable.name, i);
                if (!this.existsVariableName(variables, newVariableNameWithNumber)) {
                    newVariable.name = newVariableNameWithNumber;
                    return newVariable;
                }
            }
        } else {
            if (this.existsVariableName(variables, newVariable.name)) {
                let existingVariable = variables.find(v => v.name === newVariable.name) as ALVariable;
                existingVariable.name = this.addNumberToVariableName(variables, existingVariable.name, 1);
                newVariable.name = this.addNumberToVariableName(variables, newVariable.name, 2);
                return newVariable;
            } else {
                return newVariable;
            }
        }
    }
    private static existsVariableName(variables: ALVariable[], variableName: string): boolean {
        let existingVariable = variables.find(v => v.name === variableName);
        return !isUndefined(existingVariable);
    }
    static existsVariableNameWithNumber(variables: ALVariable[], variableName: string) {
        variableName = this.addNumberToVariableName(variables, variableName);
        let existingVariable = variables.find(v => v.name === variableName);
        return !isUndefined(existingVariable);
    }
    private static addNumberToVariableName(variables: ALVariable[], variableName: string, number?: number): string {
        if (isUndefined(number)) {
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