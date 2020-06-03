import * as vscode from 'vscode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { OwnConsole } from '../console';
import { DocumentUtils } from '../Utils/documentUtils';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
export class RangeAnalyzer {
    private document: vscode.TextDocument;
    private selectedRange: vscode.Range;
    private expandedRange: vscode.Range | undefined;
    private analyzed: boolean;
    private validToExtract: boolean | undefined;
    constructor(document: vscode.TextDocument, selectedRange: vscode.Range) {
        this.document = document;
        this.selectedRange = selectedRange;
        this.analyzed = false;
    }

    public async analyze() {
        this.analyzed = true;
        if (this.selectedRange.start.isEqual(this.selectedRange.end)) {
            this.validToExtract = false;
            return;
        }
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let procedureOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.selectedRange.start, [FullSyntaxTreeNodeKind.getTriggerDeclaration(), FullSyntaxTreeNodeKind.getMethodDeclaration()]);
        if (!procedureOrTriggerTreeNode) {
            this.validToExtract = false;
            return;
        }

        let startSyntaxTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.selectedRange.start);
        let endSyntaxTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.selectedRange.end);
        if (!startSyntaxTreeNode || !endSyntaxTreeNode) {
            this.validToExtract = false;
            return;
        }
        if (startSyntaxTreeNode === endSyntaxTreeNode) {
            if (!startSyntaxTreeNode.childNodes) {
                this.validToExtract = false;
                return;
            } else {
                let firstChildtreeNode: ALFullSyntaxTreeNode = startSyntaxTreeNode.childNodes[0];
                if (!firstChildtreeNode.fullSpan || !firstChildtreeNode.fullSpan.end) {
                    this.validToExtract = false;
                    return;
                }
                let rangeOfChildNode: vscode.Range = TextRangeExt.createVSCodeRange(firstChildtreeNode.fullSpan);
                if(!this.selectedRange.contains(rangeOfChildNode)){
                    this.validToExtract = false;
                    return;
                }
            }
        }

        let blockNodes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(procedureOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false, blockNodes);
        if (blockNodes.length !== 1) {
            this.validToExtract = false;
            return;
        }
        let blockNode: ALFullSyntaxTreeNode = blockNodes[0];

        startSyntaxTreeNode = ALFullSyntaxTreeNodeExt.reduceLevels(this.document, startSyntaxTreeNode, true);
        endSyntaxTreeNode = ALFullSyntaxTreeNodeExt.reduceLevels(this.document, endSyntaxTreeNode, false);

        let pathToStart: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(blockNode, startSyntaxTreeNode);
        let pathToEnd: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(blockNode, endSyntaxTreeNode);

        this.log(pathToStart, pathToEnd, blockNode);

        // example: Assignment Statement: End will have the AssignementStatement but the beginning will be an IdentifierName or InvocationExpression or something like that one step deeper
        let validAssignment: boolean = false;
        if (pathToEnd.length + 1 === pathToStart.length &&
            startSyntaxTreeNode.parentNode &&
            startSyntaxTreeNode.parentNode.kind === FullSyntaxTreeNodeKind.getAssignmentStatement() &&
            startSyntaxTreeNode.parentNode.childNodes && startSyntaxTreeNode.parentNode.childNodes[1].fullSpan === startSyntaxTreeNode.fullSpan) {
            let identical: boolean = true;
            for (let i = 0; i < pathToEnd.length; i++) {
                if (pathToStart[i] !== pathToEnd[i]) {
                    identical = false;
                }
            }
            if (identical) {
                validAssignment = true;
            }
        }

        //find matching hierarchy
        let maxLength = pathToStart.length < pathToEnd.length ? pathToStart.length : pathToEnd.length;
        for (let i = 0; i < maxLength; i++) {
            if (pathToStart[i] !== pathToEnd[i]) {
                let isLastElementStart = pathToStart.length === i + 1;
                let isLastElementEnd = pathToEnd.length === i + 1;
                if (!isLastElementStart && !isLastElementEnd) {
                    this.validToExtract = false;
                    return;
                }
            }
        }
        if (pathToStart.length !== pathToEnd.length) { // && !validAssignment) {
            this.validToExtract = false;
            return;
        }

        // check if start and end kinds are valid
        if (this.checkKindReducedLevels(startSyntaxTreeNode) && this.checkKindReducedLevels(endSyntaxTreeNode)) {
            if (startSyntaxTreeNode.fullSpan && startSyntaxTreeNode.fullSpan.start && endSyntaxTreeNode.fullSpan && endSyntaxTreeNode.fullSpan.end) {
                this.expandedRange = new vscode.Range(
                    startSyntaxTreeNode.fullSpan.start.line,
                    startSyntaxTreeNode.fullSpan.start.character,
                    endSyntaxTreeNode.fullSpan.end.line,
                    endSyntaxTreeNode.fullSpan.end.character
                );
            }
            this.validToExtract = true;
            return;
        }
        this.validToExtract = false;
        return;
    }
    public isValidToExtract(): boolean {
        if (!this.analyzed) {
            throw new Error('Please analyze the range before using it');
        }
        return this.validToExtract as boolean;
    }

    public getExpandedRange(): vscode.Range {
        if (!this.analyzed) {
            throw new Error('Please analyze the range before using it');
        }
        let rangeToReturn: vscode.Range;
        if (this.expandedRange) {
            rangeToReturn = this.expandedRange;
        } else {
            rangeToReturn = this.selectedRange;
        }
        return DocumentUtils.trimRange(this.document, rangeToReturn);
    }
    private checkKindReducedLevels(treeNode: ALFullSyntaxTreeNode): boolean {
        let validKinds: string[] = [
            FullSyntaxTreeNodeKind.getInvocationExpression(),
            FullSyntaxTreeNodeKind.getAssignmentStatement(),
            FullSyntaxTreeNodeKind.getCompoundAssignmentStatement(),
            FullSyntaxTreeNodeKind.getExpressionStatement(),
            FullSyntaxTreeNodeKind.getIfStatement(),
            FullSyntaxTreeNodeKind.getCaseStatement(),
            FullSyntaxTreeNodeKind.getWithStatement(),
            FullSyntaxTreeNodeKind.getRepeatStatement(),
            FullSyntaxTreeNodeKind.getWhileStatement(),
            FullSyntaxTreeNodeKind.getForEachStatement(),
            FullSyntaxTreeNodeKind.getForStatement(),
            FullSyntaxTreeNodeKind.getLogicalAndExpression(),
            FullSyntaxTreeNodeKind.getLogicalOrExpression(),
            FullSyntaxTreeNodeKind.getUnaryNotExpression(),
            FullSyntaxTreeNodeKind.getLessThanExpression(),
            FullSyntaxTreeNodeKind.getLessThanOrEqualExpression(),
            FullSyntaxTreeNodeKind.getGreaterThanExpression(),
            FullSyntaxTreeNodeKind.getGreaterThanOrEqualExpression(),
            FullSyntaxTreeNodeKind.getNotEqualsExpression(),
            FullSyntaxTreeNodeKind.getEqualsExpression(),
            FullSyntaxTreeNodeKind.getParenthesizedExpression(),
            FullSyntaxTreeNodeKind.getOptionAccessExpression(),
            FullSyntaxTreeNodeKind.getExitStatement()
        ];
        // let systemInvocations: string[] = ['Get','Find','FindFirst','FindLast','FindSet','Reset','Clear','StrSubstNo','Caption','AddLink','Ascending','Descending','CalcFields','CalcSums','ChangeCompany','ClearMarks','Consistent','Copy','CopyFilter','CopyFilters','CopyLinks','Count','CountApprox','CurrentCompany','CurrentKey','Delete','DeleteAll','DeleteLink','DeleteLinks','FieldActive','FieldCaption','FieldError','FieldName','FieldNo','FilterGroup','Find','FindFirst','FindLast','FindSet','Get','GetAscending','GetBySystemId','GetFilter','GetFilters','GetPosition','GetRangeMax','GetRangeMin','GetView','HasFilter','HasLinks','Init','Insert','IsEmpty','IsTemporary','LockTable','Mark','MarkedOnly','Modify','ModifyAll','Next','ReadConsistency','ReadPermission','RecordId','RecordLevelLocking','Relation','Rename','Reset','SecurityFiltering','SetAscending','SetAutoCalcFields','SetCurrentKey','SetFilter','SetPermissionFilter','SetPosition','SetRange','SetRecFilter','SetView','TableCaption','TableName','TestField','TransferFields','Validate','WritePermission'];
        if (treeNode.kind) {
            if (validKinds.includes(treeNode.kind)) {
                return true;
            }
        }
        return false;
    }

    private log(pathToStart: number[], pathToEnd: number[], blockNode: ALFullSyntaxTreeNode) {
        let consoleTextStart: string = "";
        pathToStart.forEach(val => {
            consoleTextStart === '' ? consoleTextStart += val : consoleTextStart += ',' + val;
        });
        let consoleTextEnd: string = "";
        pathToEnd.forEach(val => {
            consoleTextEnd === '' ? consoleTextEnd += val : consoleTextEnd += ',' + val;
        });
        let consoleText: string = consoleTextStart + ' vs. ' + consoleTextEnd;
        consoleTextStart = "";
        let currentPath: number[] = [];
        pathToStart.forEach(val => {
            currentPath.push(val);
            if (consoleTextStart !== '') {
                consoleTextStart += ',';
            }
            consoleTextStart += ALFullSyntaxTreeNodeExt.getNodeByPath(blockNode, currentPath).kind;
        });
        consoleTextEnd = "";
        currentPath = [];
        pathToEnd.forEach(val => {
            currentPath.push(val);
            if (consoleTextEnd !== '') {
                consoleTextEnd += ',';
            }
            consoleTextEnd += ALFullSyntaxTreeNodeExt.getNodeByPath(blockNode, currentPath).kind;
        });
        consoleText += "  =>  " + consoleTextStart + ' vs. ' + consoleTextEnd;
        OwnConsole.ownConsole.appendLine(consoleText);
    }
}