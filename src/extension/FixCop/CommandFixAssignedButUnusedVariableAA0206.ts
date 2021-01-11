import { readFileSync, writeFileSync } from "fs";
import { commands, Location, Position, ProgressLocation, Range, TextDocument, window } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { AnalyzerAA0008 } from "../BuildOutputCopAnalyzer/AnalyzerAA0008";
import { AnalyzerAA0206 } from "../BuildOutputCopAnalyzer/AnalyzerAA0206";
import { AnalyzedOutputLineAA0008 } from "../BuildOutputCopAnalyzer/Entities/AnalyzedOutputLineAA0008";
import { AnalyzedOutputLineAA0206 } from "../BuildOutputCopAnalyzer/Entities/AnalyzedOutputLineAA0206";
import { OwnConsole } from "../console";
import { DocumentUtils } from "../Utils/documentUtils";
import { MyTerminal } from "../Services/terminal";
import { IFixCop } from "./IFixCop";
import { ErrorLogUtils } from "../Terminal/ErrorLogUtils";

export class CommandFixAssignedButUnusedVariableAA0206 implements IFixCop {
    private assignmentsRemovedInTotal: number;
    private removeAll: boolean;

    constructor() {
        this.assignmentsRemovedInTotal = 0
        this.removeAll = false
    }
    public async resolve() {
        let result = await this.askRemoveAll()
        if (result.abort)
            return
        else {
            this.removeAll = result.removeAll
            this.compileAndRemove()
        }
    }
    public async compilationCallback(errorLogIssues: ErrorLog.Issue[]) {
        let assignmentsRemoved: number = 0
        let skippedLines: { reason: number, issue: ErrorLog.Issue }[] = []
        await window.withProgress({
            location: ProgressLocation.Notification,
            title: 'Check documents',
            cancellable: true
        }, async (progress, token) => {
            let analyzedLinesMissingParenthesis: AnalyzedOutputLineAA0008[] = new AnalyzerAA0008(errorLogIssues).sortDescending().analyzedLines;
            let analyzedLinesAssignedButUnusedVariables: AnalyzedOutputLineAA0206[] = new AnalyzerAA0206(errorLogIssues).sortDescending().analyzedLines;

            let positionsMissingParenthesis: Position[] = []
            for (const analyzedLine of analyzedLinesMissingParenthesis)
                positionsMissingParenthesis.push(analyzedLine.range.end)

            for (const analyzedLine of analyzedLinesAssignedButUnusedVariables) {
                let fileContent: string = readFileSync(analyzedLine.filePath, { encoding: 'utf8' })
                let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent));
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(analyzedLine.filePath, fileContent)
                let leftVariable: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(analyzedLine.range.start, [FullSyntaxTreeNodeKind.getIdentifierName()])
                if (!leftVariable || !leftVariable.parentNode)
                    continue;

                let assignmentStatementOrEvaluateExpression: ALFullSyntaxTreeNode | undefined = this.getStatementOrExpressionToDelete(leftVariable.parentNode)
                if (assignmentStatementOrEvaluateExpression == undefined) {
                    this.logSkippedLine(skippedLines, analyzedLine, fileLines);
                } else {
                    let deleteLine: boolean;
                    if (this.removeAll)
                        deleteLine = true
                    else
                        deleteLine = this.checkIfDeletionIsSafe(assignmentStatementOrEvaluateExpression, positionsMissingParenthesis)
                    if (deleteLine) {
                        if (this.isOneLiner(assignmentStatementOrEvaluateExpression)) {
                            let skipResult: { skipped: boolean; reason: number | undefined } = this.removeOneLiner(fileLines, assignmentStatementOrEvaluateExpression, positionsMissingParenthesis, this.removeAll);
                            if (skipResult.skipped)
                                skippedLines.push({ reason: skipResult.reason!, issue: analyzedLine.originalErrorLogIssue })
                            else {
                                assignmentsRemoved++
                                writeFileSync(analyzedLine.filePath, fileLines.join('\r\n'), { encoding: 'utf8' });
                            }
                        } else {
                            assignmentsRemoved++
                            let range: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(assignmentStatementOrEvaluateExpression.fullSpan));
                            fileLines.splice(range.start.line, range.end.line - range.start.line + 1)
                            writeFileSync(analyzedLine.filePath, fileLines.join('\r\n'), { encoding: 'utf8' });
                        }
                    } else {
                        this.logSkippedLine(skippedLines, analyzedLine, fileLines);
                    }
                }
                progress.report({ increment: 100 / analyzedLinesAssignedButUnusedVariables.length })
            }
        });
        this.assignmentsRemovedInTotal += assignmentsRemoved
        let clearedMax: boolean = assignmentsRemoved == 0
        if (!clearedMax) {
            let preScript: string[] = [MyTerminal.createPSStatusLine('Removed ' + assignmentsRemoved + ' assignment(s).', 'Start again to check if there remain some warnings.')]
            this.compileAndRemove(preScript)
        } else {
            this.printFinishMessage(skippedLines);
        }
    }
    private logSkippedLine(skippedLines: { reason: number; issue: ErrorLog.Issue; }[], analyzedLine: AnalyzedOutputLineAA0206, fileLines: string[]) {
        skippedLines.push({ reason: 2, issue: analyzedLine.originalErrorLogIssue });
        let lineNo = analyzedLine.range.start.line;
        let lines: string[] = fileLines.slice(lineNo - 3 < 0 ? 0 : lineNo - 3, lineNo + 3 >= fileLines.length - 1 ? fileLines.length - 1 : lineNo + 3)

        console.log('Skipped variable:')
        console.log({ analyzedLine: analyzedLine, lines: lines })
    }

    private printFinishMessage(skippedLines: { reason: number; issue: ErrorLog.Issue; }[]) {
        OwnConsole.ownConsole.clear();
        OwnConsole.ownConsole.show();
        OwnConsole.ownConsole.appendLine('Finished. Successfully removed assignments: ' + this.assignmentsRemovedInTotal);
        if (skippedLines.length > 0) {
            skippedLines = skippedLines.sort((a, b) => {
                if (a.reason == b.reason)
                    if (ErrorLogUtils.getUri(a.issue) == ErrorLogUtils.getUri(b.issue))
                        return ErrorLogUtils.getRange(a.issue).start.compareTo(ErrorLogUtils.getRange(b.issue).start);
                return a.reason - b.reason;
            });
            OwnConsole.ownConsole.appendLine('The following lines were skipped.');
            OwnConsole.ownConsole.appendLine('Reason | OutputLine');
            for (let skippedLine of skippedLines) {
                OwnConsole.ownConsole.appendLine(skippedLine.reason.toString().padEnd('Reason '.length, ' ') + '| ' + ErrorLogUtils.rebuildCompileLine(skippedLine.issue));
            }
            OwnConsole.ownConsole.appendLine('');
            OwnConsole.ownConsole.appendLine('Explanation of reasons:');
            if (skippedLines.some(skippedLine => skippedLine.reason == 1))
                OwnConsole.ownConsole.appendLine('Id 1: The one liner statements could be part of another one liner and so on and as I don\'t want to break you and as I think that there are not that much (hopefully), I\'ll skip the deletion of these assignments for now.');
            if (skippedLines.some(skippedLine => skippedLine.reason == 2))
                OwnConsole.ownConsole.appendLine('Id 2: It seems to be unsafe to remove this line, e.g. because on the right side of an assignments there\'s a function call which might change business logic');
        }
    }

    private getStatementOrExpressionToDelete(parentNode: ALFullSyntaxTreeNode): ALFullSyntaxTreeNode | undefined {
        if ([FullSyntaxTreeNodeKind.getAssignmentStatement(), FullSyntaxTreeNodeKind.getCompoundAssignmentStatement()].includes(parentNode.kind!)) {
            if (parentNode.childNodes)
                return parentNode;
        } else {
            if (parentNode.kind == FullSyntaxTreeNodeKind.getArgumentList()) {
                let invocationNode = parentNode.parentNode;
                if (invocationNode && invocationNode.childNodes && invocationNode.childNodes[0].identifier && invocationNode.childNodes[0].identifier.trim().toLowerCase() == 'evaluate') {
                    if (invocationNode.parentNode && invocationNode.parentNode.kind == FullSyntaxTreeNodeKind.getExpressionStatement())
                        return invocationNode.parentNode
                }
            }
        }
    }
    private removeEvaluate(argumentList: ALFullSyntaxTreeNode, assignmentsRemoved: number, fileLines: string[], analyzedLine: AnalyzedOutputLineAA0206): { removed: boolean, fileLines: string[] } {
        if (argumentList.kind == FullSyntaxTreeNodeKind.getArgumentList()) {
            let invocation = argumentList.parentNode;
            if (invocation && invocation.childNodes && invocation.childNodes[0].identifier && invocation.childNodes[0].identifier.toLowerCase() == 'evaluate') {
                if (invocation.parentNode && invocation.parentNode.kind == FullSyntaxTreeNodeKind.getExpressionStatement()) {
                    if (!this.isOneLiner(invocation.parentNode)) {
                        assignmentsRemoved++;
                        let range: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(invocation.parentNode.fullSpan));
                        fileLines.splice(range.start.line, range.end.line - range.start.line + 1);
                        writeFileSync(analyzedLine.filePath, fileLines.join('\r\n'), { encoding: 'utf8' });
                        return { removed: true, fileLines };
                    }
                }
            }
        }
        return { removed: false, fileLines }
    }

    private async askRemoveAll(): Promise<{ abort: boolean, removeAll: boolean }> {
        let options: string[] = [
            'Safe mode: No removal of assignments with functions on the right side',
            'Unsafe mode: Remove assignments with functions on the right side as well. Please check manually afterwards if no business logic has changed.'
        ]
        let chosenOption: string | undefined = await window.showQuickPick(options, { placeHolder: 'What can I remove for you?' })
        if (chosenOption)
            return { abort: false, removeAll: chosenOption == options[1] }
        else
            return { abort: true, removeAll: false }
    }
    private compileAndRemove(preScript?: string[]) {
        let keepWarnings: string[] = ['AA0206']
        if (!this.removeAll)
            keepWarnings.push('AA0008')
        if (!preScript)
            preScript = []
        let self = this;
        MyTerminal.getInstance().compileProject(this.compilationCallback.bind(self), { codeCop: true }, preScript, true, keepWarnings)
    }

    private checkIfDeletionIsSafe(assignmentStatementOrEvaluateExpression: ALFullSyntaxTreeNode, positionsMissingParenthesis: Position[]): boolean {
        if ([FullSyntaxTreeNodeKind.getAssignmentStatement(), FullSyntaxTreeNodeKind.getCompoundAssignmentStatement()].includes(assignmentStatementOrEvaluateExpression.kind!)) {
            let rightNode: ALFullSyntaxTreeNode = assignmentStatementOrEvaluateExpression.childNodes![1]
            let blackList: string[] = [FullSyntaxTreeNodeKind.getInvocationExpression()]
            if (blackList.includes(rightNode.kind!))
                return false
            for (const nodeKind of blackList) {
                let safe: boolean = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(rightNode, nodeKind, true) == undefined
                if (!safe)
                    return false
            }
            let rangeRightNode: Range = TextRangeExt.createVSCodeRange(rightNode.fullSpan)
            if (positionsMissingParenthesis.some(positionParenthesisMissing => rangeRightNode.contains(positionParenthesisMissing)))
                return false
            return true;
        } else
            return false
    }
    private isOneLiner(assignmentStatementOrEvaluateExpression: ALFullSyntaxTreeNode): boolean {
        return this.getOneLiner(assignmentStatementOrEvaluateExpression) != undefined;
    }
    private getOneLiner(assignmentStatementOrEvaluateExpression: ALFullSyntaxTreeNode): { kind: string, pathToNode: number, childNodesLength: number } | undefined {
        let oneLiners: { kind: string, pathToNode: number, childNodesLength: number }[] = []
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getIfStatement(), pathToNode: 1, childNodesLength: 2 }) //if [0] then [1]
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getIfStatement(), pathToNode: 1, childNodesLength: 3 }) //if [0] then [1] else [2] (if-part)
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getIfStatement(), pathToNode: 2, childNodesLength: 3 }) //if [0] then [1] else [2] (else-part)
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getForStatement(), pathToNode: 3, childNodesLength: 4 }) //for [0] := [1] to [2] do [3]
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getForEachStatement(), pathToNode: 2, childNodesLength: 3 }) //foreach [0] in [1] do [2]
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getCaseLine(), pathToNode: 1, childNodesLength: 2 }) //[0]: [1]
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getCaseElse(), pathToNode: 0, childNodesLength: 1 }) //else [0]
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getWhileStatement(), pathToNode: 1, childNodesLength: 2 }) //while [0] do [1]
        oneLiners.push({ kind: FullSyntaxTreeNodeKind.getWithStatement(), pathToNode: 1, childNodesLength: 2 }) //with [0] do [1]
        let pathToNode: number = ALFullSyntaxTreeNodeExt.getPathToTreeNode(assignmentStatementOrEvaluateExpression.parentNode!, assignmentStatementOrEvaluateExpression)[0]

        let oneLinerData: { kind: string, pathToNode: number, childNodesLength: number } | undefined = oneLiners.find(oneLiner =>
            oneLiner.kind == assignmentStatementOrEvaluateExpression.parentNode!.kind &&
            oneLiner.pathToNode == pathToNode &&
            oneLiner.childNodesLength == assignmentStatementOrEvaluateExpression.parentNode!.childNodes!.length)
        return oneLinerData
    }
    private removeOneLiner(fileLines: string[], node: ALFullSyntaxTreeNode, positionsMissingParenthesis: Position[], removeAll: boolean): { skipped: boolean; reason: number | undefined } {
        let oneLinerData: { kind: string, pathToNode: number, childNodesLength: number } = this.getOneLiner(node)!
        if ([FullSyntaxTreeNodeKind.getCaseLine(), FullSyntaxTreeNodeKind.getCaseElse()].includes(oneLinerData.kind)) {
            let range: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(node.parentNode!.fullSpan))
            fileLines.splice(range.start.line, range.end.line - range.start.line + 1)
            return { skipped: false, reason: undefined }
        }
        if (!this.isOneLiner(node.parentNode!)) {
            let statementRange: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(node.parentNode!.fullSpan))
            if (oneLinerData.kind == FullSyntaxTreeNodeKind.getIfStatement()) {
                let ifStatementNode: ALFullSyntaxTreeNode = node.parentNode!
                let ifExpressionNode: ALFullSyntaxTreeNode = ifStatementNode.childNodes![0]
                let ifPartNode: ALFullSyntaxTreeNode = ifStatementNode.childNodes![1]
                if (oneLinerData.pathToNode == 1 && oneLinerData.childNodesLength == 2) {
                    let skipped: boolean = this.removeOneLiner_IfPart_IfThen(fileLines, ifExpressionNode, positionsMissingParenthesis, statementRange, removeAll)
                    if (skipped)
                        return { skipped: true, reason: 2 }
                } else if (oneLinerData.childNodesLength == 3) {
                    let elsePartNode: ALFullSyntaxTreeNode = ifStatementNode.childNodes![2]
                    if (oneLinerData.pathToNode == 1) {
                        this.removeOneLiner_IfPart_IfThenElse(fileLines, ifExpressionNode, elsePartNode);
                    } else if (oneLinerData.pathToNode == 2) {
                        this.removeOneLiner_ElsePart_IfThenElse(fileLines, ifExpressionNode, ifPartNode, elsePartNode);
                    }
                }
            } else if ([FullSyntaxTreeNodeKind.getForStatement(), FullSyntaxTreeNodeKind.getForEachStatement(), FullSyntaxTreeNodeKind.getWithStatement()].includes(oneLinerData.kind)) {
                fileLines.splice(statementRange.start.line, statementRange.end.line - statementRange.start.line + 1)
            } else if ([FullSyntaxTreeNodeKind.getWhileStatement()].includes(oneLinerData.kind)) {
                let whileExpressionRange: Range = TextRangeExt.createVSCodeRange(node.parentNode!.childNodes![0].fullSpan)
                let isInvocation: boolean = node.parentNode!.childNodes![0].kind == FullSyntaxTreeNodeKind.getInvocationExpression() || positionsMissingParenthesis.some(position => whileExpressionRange.contains(position))
                if (removeAll || isInvocation)
                    fileLines.splice(statementRange.start.line, statementRange.end.line - statementRange.start.line + 1)
                else
                    return { skipped: true, reason: 2 }
            }
            return { skipped: false, reason: undefined }
        } else
            return { skipped: true, reason: 1 }
        // return CommandFixAssignedButUnusedVariableAA0206.removeOneLiner(fileLines, node.parentNode!, positionsMissingParenthesis, removeAll)
    }
    private removeOneLiner_IfPart_IfThen(fileLines: string[], ifExpressionNode: ALFullSyntaxTreeNode, positionsMissingParenthesis: Position[], statementRange: Range, removeAll: boolean): boolean {
        let ifExpressionRange: Range = TextRangeExt.createVSCodeRange(ifExpressionNode.fullSpan)
        let isInvocation: boolean = ifExpressionNode.kind == FullSyntaxTreeNodeKind.getInvocationExpression() || positionsMissingParenthesis.some(position => ifExpressionRange.contains(position))
        if (!removeAll && isInvocation)
            return true
        fileLines.splice(statementRange.start.line, statementRange.end.line - statementRange.start.line + 1)
        return false
    }
    private removeOneLiner_IfPart_IfThenElse(fileLines: string[], ifExpressionNode: ALFullSyntaxTreeNode, elsePartNode: ALFullSyntaxTreeNode) {
        let ifExpressionRange: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(ifExpressionNode.fullSpan));
        let elsePartRange: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(elsePartNode.fullSpan));
        fileLines[ifExpressionRange.end.line] = fileLines[ifExpressionRange.end.line].substr(0, ifExpressionRange.end.character) + ')' + fileLines[ifExpressionRange.end.line].substr(ifExpressionRange.end.character);
        fileLines[ifExpressionRange.start.line] = fileLines[ifExpressionRange.start.line].substr(0, ifExpressionRange.start.character) + 'not(' + fileLines[ifExpressionRange.start.line].substr(ifExpressionRange.start.character);
        if (elsePartNode.kind == FullSyntaxTreeNodeKind.getBlock()) {
            fileLines[ifExpressionRange.end.line] = fileLines[ifExpressionRange.end.line].substr(0, (ifExpressionRange.end.character + 'not()'.length)) + ' then begin';
            fileLines.splice(ifExpressionRange.end.line + 1, elsePartRange.start.line - ifExpressionRange.end.line);
        }
        else
            fileLines.splice(ifExpressionRange.end.line + 1, elsePartRange.start.line - ifExpressionRange.end.line - 1);
    }

    private removeOneLiner_ElsePart_IfThenElse(fileLines: string[], ifExpressionNode: ALFullSyntaxTreeNode, ifPartNode: ALFullSyntaxTreeNode, elsePartNode: ALFullSyntaxTreeNode) {
        let ifExpressionRange: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(ifExpressionNode.fullSpan));
        let ifPartRange: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(ifPartNode.fullSpan));
        let elsePartRange: Range = DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(elsePartNode.fullSpan));
        let replaceWith: string = '';
        if (ifPartNode.kind == FullSyntaxTreeNodeKind.getBlock()) {
            let firstWhitespace: number = fileLines[ifExpressionRange.start.line].length - fileLines[ifExpressionRange.start.line].trimLeft().length;
            replaceWith = 'end;'.padStart(firstWhitespace + 'end;'.length, ' ');
            fileLines.splice(ifPartRange.end.line, elsePartRange.end.line - ifPartRange.end.line + 1, replaceWith);
        }
        else
            fileLines.splice(ifPartRange.end.line + 1, elsePartRange.end.line - ifPartRange.end.line, replaceWith);
        if (!fileLines[ifPartRange.end.line].trimRight().endsWith(';'))
            fileLines[ifPartRange.end.line] = fileLines[ifPartRange.end.line].trimRight() + ';';
    }

    private static async checkIfZeroReferences(methodOrTrigger: ALFullSyntaxTreeNode, document: TextDocument): Promise<boolean> {
        if (methodOrTrigger.kind == FullSyntaxTreeNodeKind.getMethodDeclaration()) {
            let identifierOfMethod: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTrigger, FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
            let rangeOfIdentifier: Range = TextRangeExt.createVSCodeRange(identifierOfMethod.fullSpan);
            let locations: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', document.uri, rangeOfIdentifier.start);
            if (locations && locations.length == 1) {
                return true;
            }
            return false;
        } else// = if (methodOrTrigger.kind == FullSyntaxTreeNodeKind.getTriggerDeclaration())
            return true;
    }

    private static checkIfAccessInternal(syntaxTree: SyntaxTree, analyzeResult: { filePath: string; line: number; character: number; variableName: string; }, document: TextDocument): boolean {
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, new Position(analyzeResult.line, analyzeResult.character));
        if (objectTreeNode) {
            let propertyList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(objectTreeNode, FullSyntaxTreeNodeKind.getPropertyList(), false);
            if (propertyList) {
                let properties: ALFullSyntaxTreeNode[] = [];
                ALFullSyntaxTreeNodeExt.collectChildNodes(propertyList, FullSyntaxTreeNodeKind.getProperty(), false, properties);
                return properties.some(property => document.getText(TextRangeExt.createVSCodeRange(property.fullSpan)).toLowerCase().includes('access = internal'));
            }
        }
        return false;
    }
}