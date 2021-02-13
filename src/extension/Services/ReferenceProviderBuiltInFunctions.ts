import { readFileSync } from "fs";
import { CancellationToken, commands, Location, Position, Range, ReferenceContext, ReferenceProvider, TextDocument, Uri } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { DocumentUtils } from "../Utils/documentUtils";

export class ReferenceProviderBuiltInFunctions implements ReferenceProvider {

    async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {
        let wordRange: Range | undefined = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return [];
        let word: string = document.getText(wordRange);
        if (!['oninsert', 'onmodify', 'ondelete'].includes(word.trim().toLowerCase()))
            return [];

        let builtInFunction: BuiltInFunctions;
        switch (word.toLowerCase()) {
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
                throw new Error('Wouldn\'t happen.')
        }

        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let tableTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getTableObject(), FullSyntaxTreeNodeKind.getTableExtensionObject()]);
        if (!tableTreeNode)
            return [];
        let kindToSearch: string = tableTreeNode.kind == FullSyntaxTreeNodeKind.getTableObject() ? FullSyntaxTreeNodeKind.getIdentifierName() : FullSyntaxTreeNodeKind.getObjectReference()
        let identifierOfTable: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(tableTreeNode, kindToSearch, false);
        if (!identifierOfTable)
            return [];
        let identifierRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierOfTable.fullSpan));
        let locationsUsedOfTable: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', document.uri, identifierRange.start);
        if (!locationsUsedOfTable)
            return [];
        let locationsOfBuiltInFunctions: Location[] = [];
        for (const location of locationsUsedOfTable) {
            let fileContent: string = readFileSync(location.uri.fsPath, { encoding: 'utf8' });
            let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent))
            let lineTextOfLocation: string = fileLines[location.range.start.line]
            locationsOfBuiltInFunctions = await this.checkVariableDeclarations(lineTextOfLocation, builtInFunction, fileContent, location, locationsOfBuiltInFunctions);
            locationsOfBuiltInFunctions = this.checkSourceTable(lineTextOfLocation, builtInFunction, fileContent, location, locationsOfBuiltInFunctions);
            locationsOfBuiltInFunctions = await this.checkDataItem(lineTextOfLocation, builtInFunction, fileContent, location, locationsOfBuiltInFunctions);
        }
        return locationsOfBuiltInFunctions;
    }
    private async checkVariableDeclarations(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        let regexVariableListDeclaration: RegExp = /("[^"]+"|\w+)\s*,\s*("[^"]+"|\w+)\s*:\s*Record/ig;
        let regexVariableDeclaration: RegExp = /("[^"]+"|\w+)\s*:\s*Record/ig;
        let variableNames: string[] = [];
        if (regexVariableListDeclaration.test(lineTextOfLocation)) {
            let variableNamesOnly: string = lineTextOfLocation.substring(0, lineTextOfLocation.indexOf(':'));
            let matches: RegExpMatchArray | null = variableNamesOnly.match(/("[^"]+"|\w+)/g);
            for (const match of matches!.values()) {
                variableNames.push(match);
            }
        } else if (regexVariableDeclaration.test(lineTextOfLocation)) {
            let matches: RegExpMatchArray | null = lineTextOfLocation.match(regexVariableDeclaration);
            for (const match of matches!.values()) {
                variableNames.push(match.substring(0, match.lastIndexOf(':')));
            }
        }
        for (const variableName of variableNames) {
            let searchFor: string = variableName + '.' + builtInFunction.toLowerCase();
            if (fileContent.toLowerCase().includes(searchFor.toLowerCase())) {
                let newLocations: Location[] = await this.searchForReference(location.uri, fileContent, builtInFunction, location.range);
                locationsOfBuiltInFunctions = locationsOfBuiltInFunctions.concat(newLocations);
            }
        }
        return locationsOfBuiltInFunctions;
    }
    private checkSourceTable(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location, locationsOfBuiltInFunctions: Location[]): Location[] {
        if (lineTextOfLocation.trim().toLowerCase().startsWith('sourcetable')) {
            let regex: RegExp = new RegExp('\\s(' + builtInFunction.toString() + '\\b|' + builtInFunction.toString() + 'All\\b)', 'ig')
            let result: RegExpExecArray | null
            while (result = regex.exec(fileContent)) {
                let position: Position = DocumentUtils.getPositionOfFileContent(fileContent, result.index + 1)
                locationsOfBuiltInFunctions = locationsOfBuiltInFunctions.concat(new Location(location.uri, new Range(position, position.translate(undefined, result[1].length))));
            }
        }
        return locationsOfBuiltInFunctions
    }
    private async checkDataItem(lineTextOfLocation: string, builtInFunction: BuiltInFunctions, fileContent: string, location: Location, locationsOfBuiltInFunctions: Location[]): Promise<Location[]> {
        if (lineTextOfLocation.trim().toLowerCase().startsWith('dataitem')) {
            let locations: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', location.uri, new Position(location.range.start.line, lineTextOfLocation.indexOf('dataitem(') + 'dataitem('.length))
            if (locations) {
                let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent))
                for (const location of locations) {
                    let lineSub: string = fileLines[location.range.end.line].substring(location.range.end.character)
                    let result: RegExpExecArray | null
                    if (result = new RegExp('\\.(' + builtInFunction.toString() + '\\b|' + builtInFunction.toString() + 'All)\\b', 'i').exec(lineSub)) {
                        let position: Position = new Position(location.range.start.line, result.index + 1 + location.range.end.character)
                        locationsOfBuiltInFunctions = locationsOfBuiltInFunctions.concat(new Location(location.uri, new Range(position, position.translate(undefined, result[1].length))));
                    }
                }
            }
        }
        return locationsOfBuiltInFunctions
    }

    private async searchForReference(uri: Uri, fileContent: string, builtInFunction: BuiltInFunctions, range: Range): Promise<Location[]> {
        let eol: string = DocumentUtils.getEolByContent(fileContent);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(uri.fsPath, fileContent);
        let variableDeclaration: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(range.start, [FullSyntaxTreeNodeKind.getVariableDeclaration()]);
        if (!variableDeclaration || !variableDeclaration.childNodes)
            return []
        let variableNameTreeNode: ALFullSyntaxTreeNode = variableDeclaration.childNodes[0];
        let variableNameRange: Range = DocumentUtils.trimRange2(fileContent.split(eol), TextRangeExt.createVSCodeRange(variableNameTreeNode.fullSpan));
        let locationsBuiltInFunction: Location[] = [];
        let locationsUsedOfVariable: Location[] | undefined = await commands.executeCommand('vscode.executeReferenceProvider', uri, variableNameRange.start);
        if (locationsUsedOfVariable) {
            for (const location of locationsUsedOfVariable) {
                let builtInRange: Range = new Range(location.range.end.translate(0, 1), location.range.end.translate(0, 1 + builtInFunction.length))
                let textInRange: string = DocumentUtils.getSubstringOfFileByRange(fileContent, builtInRange)
                if (textInRange.toLowerCase() == builtInFunction.toLowerCase()) {
                    locationsBuiltInFunction.push(new Location(uri, builtInRange));
                }
            }
        }
        return locationsBuiltInFunction;
    }
}