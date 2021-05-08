import { readFileSync } from "fs";
import { CancellationToken, commands, Location, Position, Range, ReferenceContext, ReferenceProvider, TextDocument, Uri } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { Document } from "../Entities/document";
import { DocumentUtils } from "../Utils/documentUtils";

export class FindRelatedCalls implements ReferenceProvider {
    private static _show?: showInsertConfig
    private static _search: BuiltInFunctions;
    private static active: boolean;

    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {
        if (!FindRelatedCalls.active)
            return []
        FindRelatedCalls.deactivateListener()

        let references = await this.getTableOrFieldReferences(document, position)
        if (!references) return []

        let locs: Location[] = await this.searchCalls(references, document)

        let uniqueLocations: Location[] = []
        for (const location of locs) {
            if (!uniqueLocations.some(loc => loc.uri.fsPath == location.uri.fsPath && loc.range.isEqual(location.range)))
                uniqueLocations.push(location)
        }
        return uniqueLocations;
    }
    public static activateListener(search: BuiltInFunctions, show?: showInsertConfig) {
        FindRelatedCalls._search = search
        if (search != BuiltInFunctions.Validate && show === undefined)
            throw new Error('It has to be specified if only the methods with RunTrigger=true should be listed.')
        FindRelatedCalls._show = show
        FindRelatedCalls.active = true
    }
    public static deactivateListener() {
        FindRelatedCalls.active = false
    }
    private async searchCalls(references: Location[], document: TextDocument): Promise<Location[]> {
        if (FindRelatedCalls._search == BuiltInFunctions.Validate)
            return await this.searchCallsField(references);
        else
            return await this.searchCallsTable(references, document);
    }
    async searchCallsField(fieldReferences: Location[]): Promise<Location[]> {
        let locs: Location[] = []
        for (const fieldReference of fieldReferences) {
            let docReferenced: Document = await Document.load(fieldReference.uri);
            let textBeforeReference = docReferenced.fileLines[fieldReference.range.start.line].substring(0, fieldReference.range.start.character)
            if (/\.?Validate\(((?:"[^"]+"|\w+)\.)?$/i.test(textBeforeReference))
                locs.push(fieldReference)
        }
        return locs;
    }
    private async searchCallsTable(tableReferences: Location[], document: TextDocument) {
        let locs: Location[] = [];
        for (const tableReference of tableReferences) {
            let docReferenced: Document = await Document.load(tableReference.uri);

            locs = locs.concat(await this.checkVariableDeclarations(docReferenced, FindRelatedCalls._search, tableReference.range));
            locs = locs.concat(await this.checkSourceTableProperty(docReferenced, FindRelatedCalls._search, tableReference.range));
            locs = locs.concat(await this.checkTableNoProperty(docReferenced, FindRelatedCalls._search, tableReference.range));
            locs = locs.concat(await this.checkSourceTable(docReferenced, FindRelatedCalls._search, tableReference.range, document.uri));
            locs = locs.concat(await this.checkDataItem(docReferenced, FindRelatedCalls._search, tableReference.range));
            locs = locs.concat(await this.checkReturnTypes(docReferenced, FindRelatedCalls._search, tableReference.range));
        }
        return locs;
    }

    private async getTableOrFieldReferences(document: TextDocument, position: Position): Promise<Location[] | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(document.uri.fsPath, document.getText());
        let rangeToFindReferences: Range
        if (FindRelatedCalls._search == BuiltInFunctions.Validate) {
            let fieldNode = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getField(), FullSyntaxTreeNodeKind.getFieldModification()])
            if (!fieldNode) return
            let fieldIdentifier = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(fieldNode, FullSyntaxTreeNodeKind.getIdentifierName(), false)
            if (!fieldIdentifier) return
            rangeToFindReferences = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(fieldIdentifier.fullSpan));
        } else {
            let tableTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getTableObject(), FullSyntaxTreeNodeKind.getTableExtensionObject()]);
            if (!tableTreeNode)
                return;
            let kindToSearch: string = tableTreeNode.kind == FullSyntaxTreeNodeKind.getTableObject() ? FullSyntaxTreeNodeKind.getIdentifierName() : FullSyntaxTreeNodeKind.getObjectReference()
            let identifierOfTable: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(tableTreeNode, kindToSearch, false);
            if (!identifierOfTable)
                return;
            rangeToFindReferences = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierOfTable.fullSpan));
        }
        let references: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', document.uri, rangeToFindReferences.start);
        return references
    }
    private async checkVariableDeclarations(doc: Document, builtInFunction: BuiltInFunctions, tableReferenceRange: Range): Promise<Location[]> {
        let variables: { name: string, range: Range }[] = this.getTableVariableNamesAndRanges(doc, tableReferenceRange)
        let locations: Location[] = []
        for (const variable of variables) {
            let searchForA: string = variable.name + '.' + builtInFunction.toLowerCase();
            let searchForB: string = 'with ' + variable.name + ' do'
            if (doc.fileContent.toLowerCase().includes(searchForA.toLowerCase()) || doc.fileContent.toLowerCase().includes(searchForB.toLowerCase())) {
                let newLocations: Location[] = await this.checkVariableReference(doc, builtInFunction, variable.range);
                locations = locations.concat(newLocations);
            }
        }
        return locations
    }
    private getTableVariableNamesAndRanges(doc: Document, tableReferenceRange: Range): { name: string; range: Range; }[] {
        let lineTextOfLocation: string = doc.fileLines[tableReferenceRange.start.line]
        let regexVariableListDeclaration: RegExp = /("[^"]+"|\w+)\s*,\s*("[^"]+"|\w+)\s*:\s*Record/ig;
        let regexVariableDeclaration: RegExp = /("[^"]+"|\w+)\s*:\s*Record/i;
        let variableNameAndRanges: { name: string; range: Range }[] = []
        if (regexVariableListDeclaration.test(lineTextOfLocation)) {
            let variableNamesOnly: string = lineTextOfLocation.substring(0, lineTextOfLocation.lastIndexOf(':'));
            let matches: RegExpMatchArray | null = variableNamesOnly.match(/("[^"]+"|\w+)/g);
            let index: number = 0;
            for (const match of matches!.values()) {
                index = lineTextOfLocation.indexOf(match, index);
                variableNameAndRanges.push({
                    name: match.trim(),
                    range: new Range(tableReferenceRange.start.line, index, tableReferenceRange.start.line, index + match.trim().length)
                })
            }
        } else if (regexVariableDeclaration.test(lineTextOfLocation)) {
            let matches: RegExpMatchArray | null = lineTextOfLocation.match(regexVariableDeclaration);
            if (matches) {
                variableNameAndRanges.push({
                    name: matches[1],
                    range: new Range(tableReferenceRange.start.line, matches.index!, tableReferenceRange.start.line, matches.index! + matches[1].length)
                })
            }
        }
        return variableNameAndRanges
    }
    private async checkSourceTableProperty(doc: Document, builtInFunction: BuiltInFunctions, tableReferenceRange: Range): Promise<Location[]> {
        let lineTextOfLocation: string = doc.fileLines[tableReferenceRange.start.line]
        if (!lineTextOfLocation.trim().toLowerCase().startsWith('sourcetable'))
            return []
        return await this.checkRec(doc, builtInFunction, tableReferenceRange, false)
    }
    private async checkTableNoProperty(doc: Document, builtInFunction: BuiltInFunctions, tableReferenceRange: Range): Promise<Location[]> {
        let lineTextOfLocation: string = doc.fileLines[tableReferenceRange.start.line]
        if (!lineTextOfLocation.trim().toLowerCase().startsWith('tableno'))
            return []
        return await this.checkRec(doc, builtInFunction, tableReferenceRange, true)
    }
    private async checkSourceTable(doc: Document, builtInFunction: BuiltInFunctions, tableReferenceRange: Range, originalUri: Uri): Promise<Location[]> {
        if (!(originalUri.fsPath == doc.uri.fsPath))
            return []
        return await this.checkRec(doc, builtInFunction, tableReferenceRange, false)
    }
    private async checkRec(doc: Document, builtInFunction: BuiltInFunctions, tableReferenceRange: Range, checkOnRunOnly: boolean): Promise<Location[]> {
        let regex: RegExp = new RegExp('(\\bRec\.|\\s)(' + builtInFunction.toString() + '\\b|' + builtInFunction.toString() + 'All\\b)', 'ig')
        if (!regex.test(doc.fileContent))
            return []

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(doc.uri.fsPath, doc.fileContent)
        let identifierList: ALFullSyntaxTreeNode[] = []
        if (checkOnRunOnly) {
            let triggerNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTriggerDeclaration())
            if (triggerNodes.length > 0) {
                let onRunTriggerNode = triggerNodes.find(node => ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(node, FullSyntaxTreeNodeKind.getIdentifierName(), false)!.identifier?.toLowerCase() == 'onrun')!
                ALFullSyntaxTreeNodeExt.collectChildNodes(onRunTriggerNode, FullSyntaxTreeNodeKind.getIdentifierName(), true, identifierList)
            }
        } else {
            ALFullSyntaxTreeNodeExt.collectChildNodes(SyntaxTreeExt.getObjectTreeNode(syntaxTree, tableReferenceRange.start)!, FullSyntaxTreeNodeKind.getIdentifierName(), true, identifierList)
        }
        let validIdentifiers: ALFullSyntaxTreeNode[] = identifierList.filter(identifierNode => {
            if (this.getValidTableTriggerRegex(builtInFunction, true).test(identifierNode.identifier!)) {
                let startPosition = DocumentUtils.trimRange2(doc.fileLines, TextRangeExt.createVSCodeRange(identifierNode.fullSpan)).start
                let memberAccessExpression, singleInvocation: boolean = false
                memberAccessExpression = identifierNode.parentNode!.kind == FullSyntaxTreeNodeKind.getMemberAccessExpression() &&
                    identifierNode.parentNode!.childNodes![0].kind == FullSyntaxTreeNodeKind.getIdentifierName() &&
                    identifierNode.parentNode!.childNodes![0].identifier!.toLowerCase() == 'rec'
                if (!memberAccessExpression) {
                    singleInvocation = [FullSyntaxTreeNodeKind.getInvocationExpression(), FullSyntaxTreeNodeKind.getExpressionStatement()]
                        .includes(identifierNode.parentNode!.kind!);
                    if (singleInvocation) {
                        let withTreeNode = syntaxTree.findTreeNode(startPosition, [FullSyntaxTreeNodeKind.getWithStatement()])
                        if (withTreeNode && withTreeNode.childNodes![0].identifier?.toLowerCase() != 'rec')
                            return false
                    }
                }
                if (memberAccessExpression || singleInvocation) {
                    let startIndex = DocumentUtils.getIndexOfFileContent(doc.fileContent, startPosition)
                    if (this.getValidTableTriggerRegex(builtInFunction).test(doc.fileContent.substr(startIndex)))
                        return true
                }
            }
            return false
        })
        let locations: Location[] = []
        for (const validIdentifier of validIdentifiers)
            locations.push(new Location(doc.uri, DocumentUtils.trimRange2(doc.fileLines, TextRangeExt.createVSCodeRange(validIdentifier.fullSpan))))
        return locations
    }
    private async checkDataItem(doc: Document, builtInFunction: BuiltInFunctions, tableReferenceRange: Range): Promise<Location[]> {
        let lineTextOfLocation: string = doc.fileLines[tableReferenceRange.start.line]
        if (!lineTextOfLocation.trim().toLowerCase().startsWith('dataitem'))
            return []
        let match: RegExpMatchArray | null = lineTextOfLocation.match(/dataitem\(("[^"]+"|\w+)\s*;/i)
        if (!match)
            return []
        let dataItemVariableName = match[1]
        let searchForA: string = dataItemVariableName + '.' + builtInFunction.toLowerCase();
        let searchForB: string = 'with ' + dataItemVariableName + ' do'
        if (!(doc.fileContent.toLowerCase().includes(searchForA.toLowerCase()) || doc.fileContent.toLowerCase().includes(searchForB.toLowerCase())))
            return []
        let dataItemReferences: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', doc.uri, new Position(tableReferenceRange.start.line, lineTextOfLocation.indexOf('dataitem(') + 'dataitem('.length))
        if (!dataItemReferences)
            return []

        let locations: Location[] = []
        for (const dataItemReference of dataItemReferences) {
            let lineReferenced = doc.fileLines[dataItemReference.range.end.line]
            let startPos = dataItemReference.range.end.character + '.'.length
            let lineSub: string = lineReferenced.substring(startPos)
            let result: RegExpExecArray | null
            if (result = this.getValidTableTriggerRegex(builtInFunction).exec(lineSub)) {
                let position: Position = new Position(dataItemReference.range.end.line, startPos)
                result = this.getValidTableTriggerRegex(builtInFunction, true).exec(lineSub)!
                locations.push(new Location(dataItemReference.uri, new Range(position, position.translate(undefined, result[0].length))));
            } else if (/with ("[^"]+"|\w+) do/i.test(lineReferenced)) {
                locations = locations.concat(await this.checkWith(doc, dataItemReference, builtInFunction))
            }
        }
        return locations
    }
    private async checkReturnTypes(doc: Document, builtInFunction: BuiltInFunctions, tableReferenceRange: Range): Promise<Location[]> {
        let endChar: number = DocumentUtils.getIndexOfFileContent(doc.fileContent, tableReferenceRange.end)
        let fileContentSub: string = doc.fileContent.substring(0, endChar)

        let regex: RegExp = /(procedure\s*)("[^"]+"|\w+)\s*\([^)]+\)\s*("[^"]+"|\w+)?\s*:\s*Record ("[^"]+"|\w+)$/i //check if it's a return type of a procedure
        let result: RegExpExecArray | null = regex.exec(fileContentSub)
        if (!result)
            return []
        let procedureNameStartPos: number = result.index + result[1].length
        let position = DocumentUtils.getPositionOfFileContent(doc.fileContent, procedureNameStartPos)
        let procedureReferences: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', doc.uri, position)
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

    private async checkVariableReference(doc: Document, builtInFunction: BuiltInFunctions, variableNameRange: Range): Promise<Location[]> {
        let variableReferences: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', doc.uri, variableNameRange.start);
        if (!variableReferences)
            return []

        let locations: Location[] = [];
        for (const variableReference of variableReferences) {
            let regexDirectcall = this.getValidTableTriggerRegex(builtInFunction)
            let procStart: number = variableReference.range.end.character + '.'.length
            let lineSub = doc.fileLines[variableReference.range.start.line].substring(procStart)
            let result: RegExpExecArray | null
            if (result = regexDirectcall.exec(lineSub)) {
                let position: Position = new Position(variableReference.range.end.line, procStart)
                result = this.getValidTableTriggerRegex(builtInFunction, true).exec(lineSub)!
                locations.push(new Location(variableReference.uri, new Range(position, position.translate(undefined, result[0].length))));
            } else if (/with ("[^"]+"|\w+) do/i.test(doc.fileLines[variableReference.range.start.line])) {
                locations = locations.concat(await this.checkWith(doc, variableReference, builtInFunction))
            }
        }
        return locations;
    }

    private async checkWith(doc: Document, withReference: Location, builtInFunction: BuiltInFunctions) {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(doc.uri.fsPath, doc.fileContent);
        let referencedWithNode: ALFullSyntaxTreeNode = syntaxTree.findTreeNode(withReference.range.start, [FullSyntaxTreeNodeKind.getWithStatement()])!;
        let identifierList: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(referencedWithNode, FullSyntaxTreeNodeKind.getIdentifierName(), true, identifierList);

        let validIdentifiers: ALFullSyntaxTreeNode[] = identifierList.filter(identifierNode => {
            if (this.getValidTableTriggerRegex(builtInFunction, true).test(identifierNode.identifier!)) {
                let startPosition = DocumentUtils.trimRange2(doc.fileLines, TextRangeExt.createVSCodeRange(identifierNode.fullSpan)).start;
                let singleInvocation = [FullSyntaxTreeNodeKind.getInvocationExpression(), FullSyntaxTreeNodeKind.getExpressionStatement()]
                    .includes(identifierNode.parentNode!.kind!);
                if (singleInvocation) {
                    let withTreeNode = syntaxTree.findTreeNode(startPosition, [FullSyntaxTreeNodeKind.getWithStatement()])!;
                    if (TextRangeExt.createVSCodeRange(withTreeNode.fullSpan).isEqual(TextRangeExt.createVSCodeRange(referencedWithNode.fullSpan))) {
                        let startIndex = DocumentUtils.getIndexOfFileContent(doc.fileContent, startPosition);
                        if (this.getValidTableTriggerRegex(builtInFunction).test(doc.fileContent.substr(startIndex)))
                            return true;
                    }
                }
            }
            return false;
        });
        let locations: Location[] = []
        for (const validIdentifier of validIdentifiers)
            locations.push(new Location(doc.uri, DocumentUtils.trimRange2(doc.fileLines, TextRangeExt.createVSCodeRange(validIdentifier.fullSpan))));
        return locations
    }

    private getValidTableTriggerRegex(builtInFunction: BuiltInFunctions, procedureNameOnly: boolean = false): RegExp {
        if (FindRelatedCalls._show == showInsertConfig["All Insert-Calls"])
            procedureNameOnly = true

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
export enum showInsertConfig {
    "Insert(true)-Calls only",
    "All Insert-Calls",
    "No Insert-Calls"
}