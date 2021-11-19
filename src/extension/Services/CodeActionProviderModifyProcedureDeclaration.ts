import { CodeAction, commands, Diagnostic, languages, Location, Range, TextDocument, workspace } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { ALMethodNode } from "../AL Code Outline/alMethodNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ALVariable } from "../Entities/alVariable";
import { Command } from "../Entities/Command";
import { MethodType } from "../Entities/methodTypes";
import { ALParameterParser } from "../Entity Parser/alParameterParser";
import { Config } from "../Utils/config";
import { DiagnosticAnalyzer } from "../Utils/diagnosticAnalyzer";
import { MethodClassifier } from "../Utils/MethodClassifier";
import { ICodeActionProvider } from "./ICodeActionProvider";

export class CodeActionProviderModifyProcedureDeclaration implements ICodeActionProvider {
    document: TextDocument;
    range: Range;
    candidateLocations!: Location[]
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }
    async considerLine(): Promise<boolean> {
        let diagnostics: Diagnostic[] = languages.getDiagnostics(this.document.uri);
        if (!diagnostics.some(diagnostic => diagnostic.range.contains(this.range) && DiagnosticAnalyzer.getDiagnosticCode(diagnostic) == 'AL0126'))
            return false
        let candidateLocations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', this.document.uri, this.range.start)
        if (!candidateLocations)
            return false
        if (candidateLocations[0].uri.scheme == 'al-preview')
            return false
        this.candidateLocations = candidateLocations
        return true
    }
    async createCodeActions(): Promise<CodeAction[]> {
        let sourceSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document)
        let invocationExpressionNode: ALFullSyntaxTreeNode | undefined = sourceSyntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getInvocationExpression()])
        if (!invocationExpressionNode)
            return []

        let procedureName: string
        if (invocationExpressionNode.childNodes && invocationExpressionNode.childNodes[0].kind == FullSyntaxTreeNodeKind.getMemberAccessExpression())
            procedureName = invocationExpressionNode.childNodes[0].childNodes![1].identifier!
        else
            procedureName = ALFullSyntaxTreeNodeExt.getIdentifierValue(this.document, invocationExpressionNode, false)!
        let argumentList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(invocationExpressionNode, FullSyntaxTreeNodeKind.getArgumentList(), false)
        if (!argumentList)
            return []
        let variablesUsed: ALVariable[] = await ALParameterParser.createParametersOutOfArgumentListTreeNode(this.document, argumentList, procedureName, true, false)

        let destDocument: TextDocument = await workspace.openTextDocument(this.candidateLocations[0].uri)
        let publishersShouldHaveVarParametersOnly: boolean = Config.getPublisherHasVarParametersOnly(destDocument.uri);
        let destSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(destDocument)
        let objectNode: ALFullSyntaxTreeNode | undefined = destSyntaxTree.findTreeNode(this.candidateLocations[0].range.start, FullSyntaxTreeNodeKind.getAllObjectKinds())
        if (!objectNode)
            return []
        let candidateNodes: ALFullSyntaxTreeNode[] = []
        ALFullSyntaxTreeNodeExt.collectChildNodes(objectNode, FullSyntaxTreeNodeKind.getMethodDeclaration(), false, candidateNodes)
        candidateNodes = candidateNodes.filter(candidateNode => candidateNode.name?.removeQuotes().toLowerCase() == procedureName.removeQuotes().toLowerCase())
        interface IMatches { exact: number, sameBaseType: number, validAssignment: number };
        let validCandidates: { node: ALFullSyntaxTreeNode, matches: IMatches, missingParameters: ALVariable[], isPublisher: boolean }[] = []
        for (let candidateNode of candidateNodes) {
            let isValidCandidate = true
            let isPublisher = false
            let matches: { exact: number, sameBaseType: number, validAssignment: number } = { exact: 0, sameBaseType: 0, validAssignment: 0 }
            let parameterList: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(candidateNode, FullSyntaxTreeNodeKind.getParameterList(), false)!
            let parameters: ALVariable[] = []
            if (parameterList.childNodes)
                for (let i = 0; i < parameterList.childNodes!.length; i++) {
                    parameters.push(await ALParameterParser.parseParameterTreeNodeToALVariable(destDocument, parameterList.childNodes![i], true))
                }
            if (!(parameters.length < variablesUsed.length))
                continue
            for (let i = 0; i < parameters.length; i++) {
                let candidate = parameters[i]
                let used = variablesUsed[i]
                if (candidate.isVar && !used.canBeVar) {
                    isValidCandidate = false
                    break;
                }
                let validTypePairs: string[][] = [
                    ['code', 'text'],
                    ['integer', 'decimal', 'enum', 'option']
                ]
                if (candidate.type.toLowerCase() == used.type.toLowerCase())
                    matches.exact++;
                else if (candidate.getTypeShort().toLowerCase() == used.getTypeShort().toLowerCase())
                    matches.sameBaseType++;
                else {
                    let validTypePair: string[] | undefined = validTypePairs.find(pair => pair.includes(used.getTypeShort().toLowerCase()))
                    if (validTypePair && validTypePair.includes(candidate.getTypeShort().toLowerCase()))
                        matches.validAssignment++;
                    else {
                        isValidCandidate = false;
                        break;
                    }
                }
            }
            if (isValidCandidate) {
                let methodType = MethodClassifier.classifyMethodAsType(ALMethodNode.create(candidateNode))
                isPublisher = [MethodType.IntegrationEventPublisher, MethodType.BusinessEventPublisher].includes(methodType)

                let validCandidate = { node: candidateNode, matches: matches, missingParameters: variablesUsed.splice(parameters.length), isPublisher: isPublisher }
                if (publishersShouldHaveVarParametersOnly && isPublisher)
                    validCandidate.missingParameters.forEach(missingParam => { if (missingParam.canBeVar) { missingParam.isVar = true; } })

                validCandidates.push(validCandidate)
            }
        }
        let bestCandidate: { node: ALFullSyntaxTreeNode, matches: IMatches, missingParameters: ALVariable[], isPublisher: boolean } | undefined = validCandidates.sort((a, b) => {
            return b.matches.exact - a.matches.exact != 0 ? b.matches.exact - a.matches.exact :
                b.matches.sameBaseType - a.matches.sameBaseType != 0 ? b.matches.sameBaseType - a.matches.sameBaseType :
                    b.matches.validAssignment - a.matches.validAssignment != 0 ? b.matches.validAssignment - a.matches.validAssignment : 0
        }).pop()
        if (!bestCandidate)
            return []
        else {
            let addParamCA: CodeAction =
            {
                title: 'Add parameter(s) to existing procedure',
                command: {
                    command: Command.addParametersToProcedure,
                    title: 'some title',
                    arguments: [destDocument, bestCandidate.node, bestCandidate.missingParameters]
                }
            }
            let createOverloadCA: CodeAction =
            {
                title: 'Create overload of existing procedure',
                command: {
                    command: Command.createOverloadOfProcedure,
                    title: 'some title',
                    arguments: [destDocument, bestCandidate.node, bestCandidate.missingParameters]
                }
            }
            let codeActions: CodeAction[] = []
            codeActions.push(addParamCA)
            if (!bestCandidate.isPublisher) //publishers can't have overloads and adding params is not a breaking change there
                codeActions.push(createOverloadCA)
            return codeActions
        }
    }
}