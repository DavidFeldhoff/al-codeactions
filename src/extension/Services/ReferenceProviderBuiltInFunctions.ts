import { readFileSync } from "fs";
import { CancellationToken, commands, Location, Position, Range, ReferenceContext, ReferenceProvider, TextDocument, Uri } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { TextRange } from "../AL Code Outline/textRange";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { BuiltInTableDefinitionReference } from "../DefinitionsOnInsert/BuiltInTableFunctionDefinition";
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
        let locationsTableReferenced: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', document.uri, identifierRange.start);
        ReferenceProviderBuiltInFunctions.msSpendProvideReferences += new Date().getTime() - timeStart.getTime();
        if (!locationsTableReferenced)
            return [];
        let locationsTriggersReferenced: Location[] = [];
        for (const location of locationsTableReferenced) {
            let fileContent: string = readFileSync(location.uri.fsPath, { encoding: 'utf8' });
            let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent))
            let lineTextOfLocation: string = fileLines[location.range.start.line]
            locationsTriggersReferenced = locationsTriggersReferenced.concat(
                await this.checkVariableDeclarations(lineTextOfLocation, builtInFunction, fileContent, location))
            locationsTriggersReferenced = locationsTriggersReferenced.concat(
                await this.checkSourceTableProperty(lineTextOfLocation, builtInFunction, fileContent, location))
            locationsTriggersReferenced = locationsTriggersReferenced.concat(
                await this.checkTableNoProperty(lineTextOfLocation, builtInFunction, fileContent, location))
            locationsTriggersReferenced = locationsTriggersReferenced.concat(
                await this.checkSourceTable(builtInFunction, fileContent, location, document.uri))
            locationsTriggersReferenced = locationsTriggersReferenced.concat(
                await this.checkDataItem(lineTextOfLocation, builtInFunction, fileContent, location))
            locationsTriggersReferenced = locationsTriggersReferenced.concat(
                await this.checkReturnTypes(builtInFunction, fileContent, location))
        }
        locationsTriggersReferenced = await this.checkEventSubscribers(builtInFunction, identifierOfTable.identifier!, locationsTriggersReferenced)
        let uniqueLocations: Location[] = []
        for (const location of locationsTriggersReferenced) {
            if (!uniqueLocations.some(loc => loc.uri.fsPath == location.uri.fsPath && loc.range.isEqual(location.range)))
                uniqueLocations.push(location)
        }
        // OwnConsole.ownConsole.show();
        // let timeSpendComplete = (new Date().getTime() - timeStartedComplete.getTime());
        // OwnConsole.ownConsole.appendLine('msSpendProvideReferences:  ' + ReferenceProviderBuiltInFunctions.msSpendProvideReferences + ', ' + (ReferenceProviderBuiltInFunctions.msSpendProvideReferences / timeSpendComplete * 100))
        // OwnConsole.ownConsole.appendLine('msSpendCheckDataItem:      ' + ReferenceProviderBuiltInFunctions.msSpendCheckDataItem + ', ' + (ReferenceProviderBuiltInFunctions.msSpendCheckDataItem / timeSpendComplete * 100))
        // OwnConsole.ownConsole.appendLine('msSpendSearchForReference: ' + ReferenceProviderBuiltInFunctions.msSpendSearchForReference + ', ' + (ReferenceProviderBuiltInFunctions.msSpendSearchForReference / timeSpendComplete * 100))
        // OwnConsole.ownConsole.appendLine('msSpendComplete:           ' + (new Date().getTime() - timeStartedComplete.getTime()))
        return uniqueLocations;
    }
    async checkEventSubscribers(builtInFunction: BuiltInFunctions, tableName: string, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        let builtInTableDefinitionReference = new BuiltInTableDefinitionReference()
        builtInTableDefinitionReference.setBuiltInFunction(builtInFunction)
        let eventSubscribersNodes: Location[] = await builtInTableDefinitionReference.getEventSubscriberNodes(tableName);
        locationsOfBuiltInFunctions = locationsOfBuiltInFunctions.concat(eventSubscribersNodes);
        return locationsOfBuiltInFunctions
    }
    private async checkVariableDeclarations(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, locationTableReferenced: Location): Promise<Location[]> {
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
        let locations: Location[] = []
        for (let i = 0; i < variableNames.length; i++) {
            let searchForA: string = variableNames[i] + '.' + builtInFunction.toLowerCase();
            let searchForB: string = 'with ' + variableNames[i] + ' do'
            if (fileContent.toLowerCase().includes(searchForA.toLowerCase()) || fileContent.toLowerCase().includes(searchForB.toLowerCase())) {
                let newLocations: Location[] = await this.searchForReference(locationTableReferenced.uri, fileContent, builtInFunction, variableRanges[i]);
                locations = locations.concat(newLocations);
            }
        }
        return locations
    }
    private async checkSourceTableProperty(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location): Promise<Location[]> {
        if (!lineTextOfLocation.trim().toLowerCase().startsWith('sourcetable'))
            return []
        return await this.checkRec(builtInFunction, fileContent, location, false)
    }
    private async checkTableNoProperty(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location): Promise<Location[]> {
        if (!lineTextOfLocation.trim().toLowerCase().startsWith('tableno'))
            return []
        return await this.checkRec(builtInFunction, fileContent, location, true)
    }
    private async checkSourceTable(builtInFunction: BuiltInFunctions, fileContent: string, location: Location, originalUri: Uri): Promise<Location[]> {
        if (!(originalUri.fsPath == location.uri.fsPath))
            return []
        return await this.checkRec(builtInFunction, fileContent, location, false)
    }
    private async checkRec(builtInFunction: BuiltInFunctions, fileContent: string, location: Location, checkOnRunOnly: boolean): Promise<Location[]> {
        let regex: RegExp = new RegExp('(\\bRec\.|\\s)(' + builtInFunction.toString() + '\\b|' + builtInFunction.toString() + 'All\\b)', 'ig')
        if (!regex.test(fileContent))
            return []

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
        let validInvocationList: ALFullSyntaxTreeNode[] = invocationList.filter(invocationNode => {
            let memberAccessInvocation: boolean = invocationNode.childNodes![0].kind == FullSyntaxTreeNodeKind.getMemberAccessExpression() &&
                invocationNode.childNodes![0].childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                invocationNode.childNodes![0].childNodes![0].identifier?.toLowerCase() == 'rec' &&
                invocationNode.childNodes![0].childNodes![1].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                this.getValidTableTriggerRegex(builtInFunction, true).test(invocationNode.childNodes![0].childNodes![1].identifier!)
            let singleInvocation: boolean = invocationNode.childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                this.getValidTableTriggerRegex(builtInFunction, true).test(invocationNode.childNodes![0].identifier!)

            if (memberAccessInvocation) {
                let startIndex = DocumentUtils.getIndexOfFileContent(fileContent, TextRangeExt.createVSCodeRange(invocationNode.childNodes![0].childNodes![1].fullSpan).start)
                return this.getValidTableTriggerRegex(builtInFunction).test(fileContent.substr(startIndex))
            } else if (singleInvocation) {
                let fileLines = fileContent.split(DocumentUtils.getEolByContent(fileContent))
                let startIndex = DocumentUtils.getIndexOfFileContent(fileContent, DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(invocationNode.childNodes![0].fullSpan)).start)
                if (!this.getValidTableTriggerRegex(builtInFunction).test(fileContent.substr(startIndex)))
                    return false

                let withStatement: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(new Position(invocationNode.fullSpan!.start!.line, invocationNode.fullSpan!.start!.character), [FullSyntaxTreeNodeKind.getWithStatement()]);
                if (!withStatement)
                    return true
                if (withStatement.childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                    withStatement.childNodes![0].identifier?.toLowerCase() == 'rec')
                    return true;
            }
            return false
        })
        let locations: Location[] = []
        for (const validInvocationNode of validInvocationList) {
            let textRange: TextRange
            switch (validInvocationNode.childNodes![0].kind) {
                case FullSyntaxTreeNodeKind.getMemberAccessExpression():
                    textRange = validInvocationNode.childNodes![0].childNodes![1].fullSpan!
                    break;
                case FullSyntaxTreeNodeKind.getIdentifierName():
                    textRange = validInvocationNode.childNodes![0].fullSpan!
                    break;
            }
            locations.push(new Location(location.uri, DocumentUtils.trimRange3(fileContent, TextRangeExt.createVSCodeRange(textRange!))))
        }

        return locations
    }
    private async checkDataItem(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location): Promise<Location[]> {
        if (!lineTextOfLocation.trim().toLowerCase().startsWith('dataitem'))
            return []
        let match: RegExpMatchArray | null = lineTextOfLocation.match(/dataitem\(("[^"]+"|\w+)\s*;/i)
        if (!match)
            return []
        let dataItemVariableName = match[1]
        if (fileContent.toLowerCase().indexOf((dataItemVariableName + '.' + builtInFunction.toString()).toLowerCase()) == -1)
            return []
        let timeStart = new Date()
        let dataItemReferences: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', location.uri, new Position(location.range.start.line, lineTextOfLocation.indexOf('dataitem(') + 'dataitem('.length))
        ReferenceProviderBuiltInFunctions.msSpendCheckDataItem += new Date().getTime() - timeStart.getTime();
        if (!dataItemReferences)
            return []

        let locations: Location[] = []
        for (const dataItemReference of dataItemReferences) {
            let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent))
            let lineSub: string = fileLines[dataItemReference.range.end.line].substring(dataItemReference.range.end.character + '.'.length)
            let result: RegExpExecArray | null
            if (result = this.getValidTableTriggerRegex(builtInFunction).exec(lineSub)) {
                let position: Position = new Position(dataItemReference.range.end.line, dataItemReference.range.end.character + '.'.length)
                result = this.getValidTableTriggerRegex(builtInFunction, true).exec(lineSub)!
                locations.push(new Location(dataItemReference.uri, new Range(position, position.translate(undefined, result[0].length))));
            }
        }
        return locations
    }
    async checkReturnTypes(builtInFunction: BuiltInFunctions, fileContent: string, location: Location): Promise<Location[]> {
        let endChar: number = DocumentUtils.getIndexOfFileContent(fileContent, location.range.end)
        let fileContentSub: string = fileContent.substring(0, endChar)

        let regex: RegExp = /(procedure\s*)("[^"]+"|\w+)\s*\([^)]+\)\s*("[^"]+"|\w+)?\s*:\s*Record ("[^"]+"|\w+)$/i //check if it's a return type of a procedure
        let result: RegExpExecArray | null = regex.exec(fileContentSub)
        if (!result)
            return []
        let procedureNameStartPos: number = result.index + result[1].length
        let position = DocumentUtils.getPositionOfFileContent(fileContent, procedureNameStartPos)
        let procedureReferences: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', location.uri, position)
        if (!procedureReferences)
            return []
        procedureReferences = procedureReferences.sort((a, b) => a.uri.fsPath.localeCompare(b.uri.fsPath))
        let fileOfLastProcRef: string = ''
        let procRefFileContent: string;
        let locations: Location[] = []
        for (const procedureReference of procedureReferences) {
            if (fileOfLastProcRef != procedureReference.uri.fsPath) {
                procRefFileContent = readFileSync(procedureReference.uri.fsPath, { encoding: 'utf8' })
                fileOfLastProcRef = procedureReference.uri.fsPath
            }
            let endChar = DocumentUtils.getIndexOfFileContent(procRefFileContent!, procedureReference.range.end)
            let fileContentAfterProcedureName = procRefFileContent!.substr(endChar)
            let fileContentAfterProcedureArgumentList = fileContentAfterProcedureName.substr(fileContentAfterProcedureName.indexOf(')') + ').'.length)
            let result = this.getValidTableTriggerRegex(builtInFunction).exec(fileContentAfterProcedureArgumentList)
            if (result) {
                let position = DocumentUtils.getPositionOfFileContent(procRefFileContent!, procRefFileContent!.length - fileContentAfterProcedureArgumentList.length)
                result = this.getValidTableTriggerRegex(builtInFunction, true).exec(fileContentAfterProcedureArgumentList)!
                let range = new Range(position, position.translate(0, result[0].length))
                locations.push(new Location(procedureReference.uri, range))
            }
        }
        return locations
    }

    private async searchForReference(uri: Uri, fileContent: string, builtInFunction: BuiltInFunctions, variableNameRange: Range): Promise<Location[]> {
        let eol: string = DocumentUtils.getEolByContent(fileContent);
        let fileLines: string[] = fileContent.split(eol)

        let timeStart = new Date();
        let variableReferences: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', uri, variableNameRange.start);
        ReferenceProviderBuiltInFunctions.msSpendSearchForReference += new Date().getTime() - timeStart.getTime();
        if (!variableReferences)
            return []

        let locations: Location[] = [];
        for (const variableReference of variableReferences) {
            let regexDirectcall = this.getValidTableTriggerRegex(builtInFunction)
            let lineSub = fileLines[variableReference.range.start.line].substring(variableReference.range.end.character + '.'.length)
            let result: RegExpExecArray | null
            if (result = regexDirectcall.exec(lineSub)) {
                let position: Position = new Position(variableReference.range.end.line, result.index + '.'.length + variableReference.range.end.character)
                result = this.getValidTableTriggerRegex(builtInFunction, true).exec(lineSub)!
                locations.push(new Location(variableReference.uri, new Range(position, position.translate(undefined, result[0].length))));
            } else if (/with ("[^"]+"|\w+) do/i.test(fileLines[variableReference.range.start.line])) {
                let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(variableReference.uri.fsPath, fileContent);
                let withStatement: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(variableReference.range.start, [FullSyntaxTreeNodeKind.getWithStatement()])!
                let invocationList: ALFullSyntaxTreeNode[] = []
                ALFullSyntaxTreeNodeExt.collectChildNodes(withStatement, FullSyntaxTreeNodeKind.getInvocationExpression(), true, invocationList)
                let insertInvocationNodes: ALFullSyntaxTreeNode[] = invocationList.filter(invocationNode => {
                    if (invocationNode.childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName()) {
                        let range = TextRangeExt.createVSCodeRange(invocationNode.childNodes![0].fullSpan)
                        let position = DocumentUtils.trimRange2(fileLines, range).start
                        let fcSub = fileContent.substr(DocumentUtils.getIndexOfFileContent(fileContent, position))
                        if (regexDirectcall.test(fcSub))
                            return true
                    }
                    return false
                })

                for (const insertInvocationNode of insertInvocationNodes) {
                    let insertIdentifierNode = insertInvocationNode.childNodes![0]
                    locations.push(new Location(
                        variableReference.uri,
                        DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(insertIdentifierNode.fullSpan))
                    ))
                }
            }
        }
        return locations;
    }

    getValidTableTriggerRegex(builtInFunction: BuiltInFunctions, procedureNameOnly: boolean = false): RegExp {
        switch (builtInFunction) {
            case BuiltInFunctions.Insert:
                // Record.Insert()
                // Record.Insert(RunTrigger: Boolean)
                // Record.Insert(RunTrigger: Boolean, InsertWithSystemId: Boolean)
                if (procedureNameOnly)
                    return new RegExp(/^Insert\b/i)
                return new RegExp(/^Insert\((?!false)[^)]+\)/i)
            case BuiltInFunctions.Modify:
                // Record.Modify([RunTrigger: Boolean])
                // Record.ModifyAll(Field: Any, NewValue: Any [, RunTrigger: Boolean])
                if (procedureNameOnly)
                    return new RegExp(/^(Modify|ModifyAll)\b/i)
                return new RegExp(/^(Modify\((?!false)[^)]+\)|ModifyAll\([^,]+,[^,]+,(?!\s*false)[^)]+\))/i)
            case BuiltInFunctions.Delete:
                // Record.Delete([RunTrigger: Boolean])
                // Record.DeleteAll([RunTrigger: Boolean])
                if (procedureNameOnly)
                    return new RegExp(/^(Delete|DeleteAll)\b/i)
                return new RegExp(/^(Delete|DeleteAll)\((?!false)[^)]+\)/i)
            case BuiltInFunctions.Validate:
                // Record.Validate(Field: Any [, NewValue: Any])
                return new RegExp(/^Validate\(/i)
            case BuiltInFunctions.Rename:
                // Record.Rename(Value1: Any [, Value2: Any,...])
                if (procedureNameOnly)
                    return new RegExp(/^Rename\b/i)
                return new RegExp(/^Rename\([^)]*\)/i)
        }
    }
}