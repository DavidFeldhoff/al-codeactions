import { readFileSync } from "fs";
import { CancellationToken, commands, Location, Position, Range, ReferenceContext, ReferenceProvider, TextDocument, Uri } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { OwnConsole } from "../console";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { DocumentUtils } from "../Utils/documentUtils";

export class ReferenceProviderBuiltInFunctions implements ReferenceProvider {
    static msSpendProvideReferences: number;
    static msSpendCheckDataItem: number;
    static msSpendSearchForReference: number;
    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {
        let timeStartedComplete = new Date();
        let wordRange: Range | undefined = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return [];
        let word: string = document.getText(wordRange);

        let builtInFunction: BuiltInFunctions;
        switch (word.trim().toLowerCase()) {
            case 'oninsert':
                builtInFunction = BuiltInFunctions.Insert;
                break;
            case 'onmodify':
                builtInFunction = BuiltInFunctions.Modify;
                break;
            case 'ondelete':
                builtInFunction = BuiltInFunctions.Delete;
                break;
            default:
                return [];
        }
        ReferenceProviderBuiltInFunctions.msSpendProvideReferences = 0
        ReferenceProviderBuiltInFunctions.msSpendCheckDataItem = 0
        ReferenceProviderBuiltInFunctions.msSpendSearchForReference = 0

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(document.uri.fsPath, document.getText());
        let tableTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getTableObject(), FullSyntaxTreeNodeKind.getTableExtensionObject()]);
        if (!tableTreeNode)
            return [];
        let kindToSearch: string = tableTreeNode.kind == FullSyntaxTreeNodeKind.getTableObject() ? FullSyntaxTreeNodeKind.getIdentifierName() : FullSyntaxTreeNodeKind.getObjectReference()
        let identifierOfTable: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(tableTreeNode, kindToSearch, false);
        if (!identifierOfTable)
            return [];
        let identifierRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierOfTable.fullSpan));
        let timeStart = new Date();
        let locationsUsedOfTable: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', document.uri, identifierRange.start);
        ReferenceProviderBuiltInFunctions.msSpendProvideReferences += new Date().getTime() - timeStart.getTime();
        if (!locationsUsedOfTable)
            return [];
        let locationsOfBuiltInFunctions: Location[] = [];
        for (const location of locationsUsedOfTable) {
            let fileContent: string = readFileSync(location.uri.fsPath, { encoding: 'utf8' });
            let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent))
            let lineTextOfLocation: string = fileLines[location.range.start.line]
            locationsOfBuiltInFunctions = await this.checkVariableDeclarations(lineTextOfLocation, builtInFunction, fileContent, location, locationsOfBuiltInFunctions);
            locationsOfBuiltInFunctions = await this.checkSourceTableProperty(lineTextOfLocation, builtInFunction, fileContent, location, locationsOfBuiltInFunctions);
            locationsOfBuiltInFunctions = await this.checkTableNoProperty(lineTextOfLocation, builtInFunction, fileContent, location, locationsOfBuiltInFunctions);
            locationsOfBuiltInFunctions = await this.checkSourceTable(lineTextOfLocation, builtInFunction, fileContent, location, document.uri, locationsOfBuiltInFunctions);
            locationsOfBuiltInFunctions = await this.checkDataItem(lineTextOfLocation, builtInFunction, fileContent, location, locationsOfBuiltInFunctions);
        }
        // OwnConsole.ownConsole.show();
        // let timeSpendComplete = (new Date().getTime() - timeStartedComplete.getTime());
        // OwnConsole.ownConsole.appendLine('msSpendProvideReferences:  ' + ReferenceProviderBuiltInFunctions.msSpendProvideReferences + ', ' + (ReferenceProviderBuiltInFunctions.msSpendProvideReferences / timeSpendComplete * 100))
        // OwnConsole.ownConsole.appendLine('msSpendCheckDataItem:      ' + ReferenceProviderBuiltInFunctions.msSpendCheckDataItem + ', ' + (ReferenceProviderBuiltInFunctions.msSpendCheckDataItem / timeSpendComplete * 100))
        // OwnConsole.ownConsole.appendLine('msSpendSearchForReference: ' + ReferenceProviderBuiltInFunctions.msSpendSearchForReference + ', ' + (ReferenceProviderBuiltInFunctions.msSpendSearchForReference / timeSpendComplete * 100))
        // OwnConsole.ownConsole.appendLine('msSpendComplete:           ' + (new Date().getTime() - timeStartedComplete.getTime()))
        return locationsOfBuiltInFunctions;
    }
    private async checkVariableDeclarations(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, locationTableReferenced: Location, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        let regexVariableListDeclaration: RegExp = /("[^"]+"|\w+)\s*,\s*("[^"]+"|\w+)\s*:\s*Record/ig;
        let regexVariableDeclaration: RegExp = /("[^"]+"|\w+)\s*:\s*Record/i;
        let variableNames: string[] = [];
        let variableRanges: Range[] = []
        if (regexVariableListDeclaration.test(lineTextOfLocation)) {
            let variableNamesOnly: string = lineTextOfLocation.substring(0, lineTextOfLocation.lastIndexOf(':'));
            let matches: RegExpMatchArray | null = variableNamesOnly.match(/("[^"]+"|\w+)/g);
            let index: number = 0;
            for (const match of matches!.values()) {
                index = lineTextOfLocation.indexOf(match, index);
                variableNames.push(match.trim());
                variableRanges.push(new Range(locationTableReferenced.range.start.line, index, locationTableReferenced.range.start.line, index + match.trim().length))
            }
        } else if (regexVariableDeclaration.test(lineTextOfLocation)) {
            let matches: RegExpMatchArray | null = lineTextOfLocation.match(regexVariableDeclaration);
            if (matches) {
                variableNames.push(matches[1]);
                variableRanges.push(new Range(locationTableReferenced.range.start.line, matches.index!, locationTableReferenced.range.start.line, matches.index! + matches[1].length))
            }
        }
        for (let i = 0; i < variableNames.length; i++) {
            let searchForA: string = variableNames[i] + '.' + builtInFunction.toLowerCase();
            let searchForB: string = 'with ' + variableNames[i] + ' do'
            if (fileContent.toLowerCase().includes(searchForA.toLowerCase()) || fileContent.toLowerCase().includes(searchForB.toLowerCase())) {
                let newLocations: Location[] = await this.searchForReference(locationTableReferenced.uri, fileContent, builtInFunction, variableRanges[i]);
                locationsOfBuiltInFunctions = locationsOfBuiltInFunctions.concat(newLocations);
            }
        }
        return locationsOfBuiltInFunctions;
    }
    private async checkSourceTableProperty(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        if (lineTextOfLocation.trim().toLowerCase().startsWith('sourcetable'))
            locationsOfBuiltInFunctions = await this.checkRec(builtInFunction, fileContent, location, locationsOfBuiltInFunctions, false)
        return locationsOfBuiltInFunctions
    }
    private async checkTableNoProperty(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        if (lineTextOfLocation.trim().toLowerCase().startsWith('tableno'))
            locationsOfBuiltInFunctions = await this.checkRec(builtInFunction, fileContent, location, locationsOfBuiltInFunctions, true)
        return locationsOfBuiltInFunctions
    }
    private async checkSourceTable(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location, originalUri: Uri, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        if (originalUri.fsPath == location.uri.fsPath)
            locationsOfBuiltInFunctions = await this.checkRec(builtInFunction, fileContent, location, locationsOfBuiltInFunctions, false)
        return locationsOfBuiltInFunctions
    }
    private async checkRec(builtInFunction: BuiltInFunctions, fileContent: string, location: Location, locationsOfBuiltInFunctions: Location[], checkOnRunOnly: boolean): Promise<Location[]> {
        let regex: RegExp = new RegExp('(\\bRec\.|\\s)(' + builtInFunction.toString() + '\\b|' + builtInFunction.toString() + 'All\\b)', 'ig')
        if (!regex.test(fileContent))
            return locationsOfBuiltInFunctions

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(location.uri.fsPath, fileContent)
        let invocationList: ALFullSyntaxTreeNode[] = []
        if (checkOnRunOnly) {
            let triggerNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTriggerDeclaration())
            if (triggerNodes.length > 0) {
                let onRunTriggerNode = triggerNodes.find(node => ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(node, FullSyntaxTreeNodeKind.getIdentifierName(), false)!.identifier?.toLowerCase() == 'onrun')!
                ALFullSyntaxTreeNodeExt.collectChildNodes(onRunTriggerNode, FullSyntaxTreeNodeKind.getInvocationExpression(), true, invocationList)
            }
        } else {
            ALFullSyntaxTreeNodeExt.collectChildNodes(SyntaxTreeExt.getObjectTreeNode(syntaxTree, location.range.start)!, FullSyntaxTreeNodeKind.getInvocationExpression(), true, invocationList)
        }
        let validMethodCalls: string[] = [builtInFunction.toLowerCase(), builtInFunction.toLowerCase() + 'all']
        let insertInvocationList: ALFullSyntaxTreeNode[] = invocationList.filter(invocationNode => {
            if (invocationNode.childNodes![0].kind == FullSyntaxTreeNodeKind.getMemberAccessExpression() &&
                invocationNode.childNodes![0].childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                invocationNode.childNodes![0].childNodes![0].identifier?.toLowerCase() == 'rec' &&
                invocationNode.childNodes![0].childNodes![1].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                validMethodCalls.includes(invocationNode.childNodes![0].childNodes![1].identifier!.toLowerCase())) {
                return true
            } else if (invocationNode.childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                validMethodCalls.includes(invocationNode.childNodes![0].identifier!.toLowerCase())) {

                let withStatement: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(new Position(invocationNode.fullSpan!.start!.line, invocationNode.fullSpan!.start!.character), [FullSyntaxTreeNodeKind.getWithStatement()]);
                if (!withStatement)
                    return true
                if (withStatement.childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                    withStatement.childNodes![0].identifier?.toLowerCase() == 'rec')
                    return true;
            }
            return false
        })
        for (const insertInvocationNode of insertInvocationList) {
            let identifierNodes: ALFullSyntaxTreeNode[] = []
            ALFullSyntaxTreeNodeExt.collectChildNodes(insertInvocationNode, FullSyntaxTreeNodeKind.getIdentifierName(), true, identifierNodes)
            let insertIdentifierNode: ALFullSyntaxTreeNode = identifierNodes.find(node => node.identifier?.toLowerCase() == 'insert')!
            locationsOfBuiltInFunctions.push(new Location(
                location.uri,
                DocumentUtils.trimRange2(
                    fileContent.split(DocumentUtils.getEolByContent(fileContent)),
                    TextRangeExt.createVSCodeRange(insertIdentifierNode.fullSpan)
                )
            ))
        }

        return locationsOfBuiltInFunctions
    }
    private async checkDataItem(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        if (lineTextOfLocation.trim().toLowerCase().startsWith('dataitem')) {
            let startPos = new Position(location.range.start.line, lineTextOfLocation.indexOf('dataitem(') + 'dataitem('.length)
            let match: RegExpMatchArray | null = lineTextOfLocation.match(/dataitem\(("[^"]+"|\w+)\s*;/i)
            if (!match)
                return locationsOfBuiltInFunctions
            let dataItemVariableName = match[1]
            if (fileContent.indexOf(dataItemVariableName + '.' + builtInFunction.toString()) == -1)
                return locationsOfBuiltInFunctions
            let timeStart = new Date()
            let locations: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', location.uri, new Position(location.range.start.line, lineTextOfLocation.indexOf('dataitem(') + 'dataitem('.length))
            ReferenceProviderBuiltInFunctions.msSpendCheckDataItem += new Date().getTime() - timeStart.getTime();
            if (locations) {
                for (const location of locations) {
                    let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent))
                    let lineSub: string = fileLines[location.range.end.line].substring(location.range.end.character)
                    let result: RegExpExecArray | null
                    if (result = new RegExp('\\.(' + builtInFunction.toString() + '\\b|' + builtInFunction.toString() + 'All)\\b', 'i').exec(lineSub)) {
                        let position: Position = new Position(location.range.start.line, result.index + 1 + location.range.end.character)
                        locationsOfBuiltInFunctions.push(new Location(location.uri, new Range(position, position.translate(undefined, result[1].length))));
                    }
                }
            }
        }
        return locationsOfBuiltInFunctions
    }

    private async searchForReference(uri: Uri, fileContent: string, builtInFunction: BuiltInFunctions, variableNameRange: Range): Promise<Location[]> {
        let eol: string = DocumentUtils.getEolByContent(fileContent);
        let fileLines: string[] = fileContent.split(eol)

        let locationsBuiltInFunction: Location[] = [];
        let timeStart = new Date();
        let locationsUsedOfVariable: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', uri, variableNameRange.start);
        ReferenceProviderBuiltInFunctions.msSpendSearchForReference += new Date().getTime() - timeStart.getTime();
        if (locationsUsedOfVariable) {
            for (const location of locationsUsedOfVariable) {
                let funcName: string = builtInFunction.toString()
                let rFuncName: string = `\\b(${funcName}\\b|${funcName}All)\\b`
                let regexDirectcall = new RegExp(`\\.${rFuncName}`, 'i')
                let lineSub = fileLines[location.range.start.line].substring(location.range.end.character)
                let result: RegExpExecArray | null
                if (result = regexDirectcall.exec(lineSub)) {
                    let position: Position = new Position(location.range.start.line, result.index + '.'.length + location.range.end.character)
                    locationsBuiltInFunction.push(new Location(location.uri, new Range(position, position.translate(undefined, result[1].length))));
                } else if (/with ("[^"]+"|\w+) do/i.test(fileLines[location.range.start.line])) {
                    let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(location.uri.fsPath, fileContent);
                    let withStatement: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(location.range.start, [FullSyntaxTreeNodeKind.getWithStatement()])!
                    let invocationList: ALFullSyntaxTreeNode[] = []
                    ALFullSyntaxTreeNodeExt.collectChildNodes(withStatement, FullSyntaxTreeNodeKind.getInvocationExpression(), true, invocationList)
                    let insertInvocationNodes: ALFullSyntaxTreeNode[] = invocationList.filter(invocationNode =>
                        invocationNode.childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                        new RegExp(rFuncName, 'i').test(invocationNode.childNodes![0].identifier!.toLowerCase()))
                    for (const insertInvocationNode of insertInvocationNodes) {
                        let insertIdentifierNode = insertInvocationNode.childNodes![0]
                        locationsBuiltInFunction.push(new Location(
                            location.uri,
                            DocumentUtils.trimRange2(
                                fileContent.split(DocumentUtils.getEolByContent(fileContent)),
                                TextRangeExt.createVSCodeRange(insertIdentifierNode.fullSpan)
                            )
                        ))
                    }
                }
            }
        }
        return locationsBuiltInFunction;
    }
}