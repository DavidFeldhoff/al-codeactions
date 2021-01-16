import * as vscode from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { DocumentUtils } from '../Utils/documentUtils';
import { Err } from '../Utils/Err';
export class RangeAnalyzer {
    private document: vscode.TextDocument;
    private selectedRange: vscode.Range;
    private expandedRange: vscode.Range | undefined;
    private analyzed: boolean;
    private validToExtractAsStandalone: boolean | undefined;
    private validToExtractOnlyWithReturnType: boolean | undefined;
    private treeNodeToExtractStart: ALFullSyntaxTreeNode | undefined;
    private treeNodeToExtractEnd: ALFullSyntaxTreeNode | undefined;
    constructor(document: vscode.TextDocument, selectedRange: vscode.Range) {
        this.document = document;
        this.selectedRange = selectedRange;
        this.analyzed = false;
    }

    public async analyze() {
        this.analyzed = true;
        if (this.selectedRange.start.isEqual(this.selectedRange.end)) {
            return;
        }
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);
        let procedureOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.selectedRange.start, [FullSyntaxTreeNodeKind.getTriggerDeclaration(), FullSyntaxTreeNodeKind.getMethodDeclaration()]);
        if (!procedureOrTriggerTreeNode) {
            return;
        }

        let startSyntaxTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.selectedRange.start);
        let endSyntaxTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.selectedRange.end);
        if (!startSyntaxTreeNode || !endSyntaxTreeNode) {
            return;
        }

        let blockNodes: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(procedureOrTriggerTreeNode, FullSyntaxTreeNodeKind.getBlock(), false, blockNodes);
        if (blockNodes.length !== 1) {
            return;
        }
        let blockNode: ALFullSyntaxTreeNode = blockNodes[0];

        let pathToStart: number[] | undefined;
        let pathToEnd: number[] | undefined;
        ({ pathToStart, pathToEnd, startSyntaxTreeNode, endSyntaxTreeNode } = this.reduceLevelsToSameLevel(blockNode, startSyntaxTreeNode, endSyntaxTreeNode));
        this.treeNodeToExtractStart = startSyntaxTreeNode;
        this.treeNodeToExtractEnd = endSyntaxTreeNode;
        this.log(pathToStart, pathToEnd, blockNode);

        if (this.treeNodeToExtractStart === this.treeNodeToExtractEnd) {
            if (!this.isWholeTreeNodeWithChildsSelected(this.treeNodeToExtractStart, this.selectedRange)) {
                return;
            }
        }

        //find matching hierarchy
        if (!this.isOnSameLevelWithMaxDifferenceOfOne(pathToStart, pathToEnd)) {
            return;
        }

        // check if start and end kinds are valid
        this.checkNodesAreValidToExtract(this.treeNodeToExtractStart, this.treeNodeToExtractEnd);
        if (this.isValidToExtract()) {
            let startRange: vscode.Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(this.treeNodeToExtractStart.fullSpan));
            let endRange: vscode.Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(this.treeNodeToExtractEnd.fullSpan));
            this.expandedRange = new vscode.Range(startRange.start, endRange.end);
            return;
        }
        return;
    }
    private checkNodesAreValidToExtract(treeNodeToExtractStart: ALFullSyntaxTreeNode, treeNodeToExtractEnd: ALFullSyntaxTreeNode) {
        let validKinds: boolean = this.checkKindReducedLevelsStandalone(treeNodeToExtractStart) &&
            this.checkKindReducedLevelsStandalone(treeNodeToExtractEnd);
        if (validKinds) {
            this.validToExtractAsStandalone = true;
        }
        else {
            validKinds = this.checkKindReducedLevelsOnlyWithReturnType(treeNodeToExtractStart) &&
                this.checkKindReducedLevelsOnlyWithReturnType(treeNodeToExtractEnd);
            if (validKinds) {
                this.validToExtractOnlyWithReturnType = true;
            }
        }
    }

    isWholeTreeNodeWithChildsSelected(treeNodeToExtract: ALFullSyntaxTreeNode, selectedRange: vscode.Range): boolean {
        if (!treeNodeToExtract.childNodes) {
            return false;
        } else {
            let firstChildTreeNode: ALFullSyntaxTreeNode = treeNodeToExtract.childNodes[0];
            let lastChildTreeNode: ALFullSyntaxTreeNode = treeNodeToExtract.childNodes[treeNodeToExtract.childNodes.length - 1];
            let rangeOfFirstChildNode: vscode.Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(firstChildTreeNode.fullSpan));
            let rangeOfLastChildNode: vscode.Range = DocumentUtils.trimRange(this.document, TextRangeExt.createVSCodeRange(lastChildTreeNode.fullSpan));
            if (!selectedRange.contains(rangeOfFirstChildNode) || !selectedRange.contains(rangeOfLastChildNode)) {
                return false;
            }
        }
        return true;
    }
    private isOnSameLevelWithMaxDifferenceOfOne(pathToStart: number[], pathToEnd: number[]): boolean {
        if (pathToStart.length !== pathToEnd.length) {
            return false;
        }
        let maxLength = pathToStart.length;
        for (let i = 0; i < maxLength; i++) {
            if (pathToStart[i] !== pathToEnd[i]) {
                let isLastElementStart = pathToStart.length === i + 1;
                let isLastElementEnd = pathToEnd.length === i + 1;
                if (!isLastElementStart && !isLastElementEnd) {
                    return false;
                }
            }
        }
        return true;
    }
    private reduceLevelsToSameLevel(blockNode: ALFullSyntaxTreeNode, startSyntaxTreeNode: ALFullSyntaxTreeNode, endSyntaxTreeNode: ALFullSyntaxTreeNode) {
        let pathToStartBeforeReduce: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(blockNode, startSyntaxTreeNode);
        let pathToEndBeforeReduce: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(blockNode, endSyntaxTreeNode);

        let newStartSyntaxTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.reduceLevels(this.document, startSyntaxTreeNode, true);
        let pathToStartAfterReduce: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(blockNode, newStartSyntaxTreeNode);

        let maxReduce = pathToEndBeforeReduce.length - pathToStartAfterReduce.length;
        let newEndSyntaxTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.reduceLevels(this.document, endSyntaxTreeNode, false, maxReduce);
        let pathToEndAfterReduce: number[] = ALFullSyntaxTreeNodeExt.getPathToTreeNode(blockNode, newEndSyntaxTreeNode);

        if (pathToEndAfterReduce.length > pathToStartAfterReduce.length) {
            maxReduce = pathToStartBeforeReduce.length - pathToEndAfterReduce.length;
            newStartSyntaxTreeNode = ALFullSyntaxTreeNodeExt.reduceLevels(this.document, startSyntaxTreeNode, true, maxReduce);
            pathToStartAfterReduce = ALFullSyntaxTreeNodeExt.getPathToTreeNode(blockNode, newStartSyntaxTreeNode);
        }
        endSyntaxTreeNode = newEndSyntaxTreeNode;
        startSyntaxTreeNode = newStartSyntaxTreeNode;
        let pathToStart: number[] = pathToStartAfterReduce;
        let pathToEnd: number[] = pathToEndAfterReduce;
        return { pathToStart, pathToEnd, startSyntaxTreeNode, endSyntaxTreeNode };
    }

    public isValidToExtract(): boolean {
        if (!this.analyzed) {
            Err._throw('Please analyze the range before using it');
        }
        if (this.isValidToExtractOnlyWithReturnType()) {
            return true;
        }
        return this.validToExtractAsStandalone ? this.validToExtractAsStandalone : false;
    }
    public isValidToExtractOnlyWithReturnType(): boolean {
        if (!this.analyzed) {
            Err._throw('Please analyze the range before using it');
        }
        return this.validToExtractOnlyWithReturnType ? this.validToExtractOnlyWithReturnType : false;
    }
    public getTreeNodeToExtractStart(): ALFullSyntaxTreeNode {
        if (!this.treeNodeToExtractStart) {
            Err._throw('TreeNode must be set when called.');
        }
        return this.treeNodeToExtractStart;
    }
    public getTreeNodeToExtractEnd(): ALFullSyntaxTreeNode {
        if (!this.treeNodeToExtractEnd) {
            Err._throw('TreeNode must be set when called.');
        }
        return this.treeNodeToExtractEnd;
    }

    public getExpandedRange(): vscode.Range {
        if (!this.analyzed) {
            Err._throw('Please analyze the range before using it');
        }
        let rangeToReturn: vscode.Range;
        if (this.expandedRange) {
            rangeToReturn = this.expandedRange;
        } else {
            rangeToReturn = this.selectedRange;
        }
        return DocumentUtils.trimRange(this.document, rangeToReturn);
    }
    private checkKindReducedLevelsStandalone(treeNode: ALFullSyntaxTreeNode): boolean {
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
            FullSyntaxTreeNodeKind.getParenthesizedExpression(),
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
    private checkKindReducedLevelsOnlyWithReturnType(treeNode: ALFullSyntaxTreeNode): boolean {
        let validKinds: string[] = [
            FullSyntaxTreeNodeKind.getInListExpression(),
            FullSyntaxTreeNodeKind.getAddExpression(),
            FullSyntaxTreeNodeKind.getSubtractExpression(),
            FullSyntaxTreeNodeKind.getDivideExpression(),
            FullSyntaxTreeNodeKind.getMultiplyExpression(),
            FullSyntaxTreeNodeKind.getUnaryNotExpression(),
            FullSyntaxTreeNodeKind.getUnaryMinusExpression(),
            FullSyntaxTreeNodeKind.getUnaryPlusExpression(),
            FullSyntaxTreeNodeKind.getNotEqualsExpression(),
            FullSyntaxTreeNodeKind.getEqualsExpression(),
            FullSyntaxTreeNodeKind.getLogicalOrExpression(),
            FullSyntaxTreeNodeKind.getLogicalAndExpression(),
            FullSyntaxTreeNodeKind.getLessThanOrEqualExpression(),
            FullSyntaxTreeNodeKind.getLessThanExpression(),
            FullSyntaxTreeNodeKind.getGreaterThanOrEqualExpression(),
            FullSyntaxTreeNodeKind.getGreaterThanExpression(),
            FullSyntaxTreeNodeKind.getOptionAccessExpression()
        ];
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
        // OwnConsole.ownConsole.appendLine(consoleText);
    }
}