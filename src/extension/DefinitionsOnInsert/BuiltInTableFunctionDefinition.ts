import { readFileSync } from "fs";
import { commands, Location, Position, Range, TextDocument, Uri, workspace } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { DocumentUtils } from "../Utils/documentUtils";
import { WorkspaceUtils } from "../Utils/workspaceUtils";
import { BuiltInFunctionDefinitionInterface } from "./BuiltInFunctionDefinitionInterface";
import { BuiltInFunctions } from "./BuiltInFunctions";

export class BuiltInTableDefinitionReference implements BuiltInFunctionDefinitionInterface {
    location: Location | undefined;
    builtInFunction: BuiltInFunctions | undefined

    getBuiltInFunctionsSupported(): BuiltInFunctions[] {
        return [BuiltInFunctions.Insert, BuiltInFunctions.Modify, BuiltInFunctions.Delete, BuiltInFunctions.Rename];
    }
    setBuiltInFunction(builtInFunction: BuiltInFunctions) {
        this.builtInFunction = builtInFunction;
    }
    async findLocation(document: TextDocument, wordRange: Range): Promise<boolean> {
        if (document.getText(new Range(wordRange.start.translate(0, -1), wordRange.start)) != '.') {
            if (await this.existsExplicitWith(document, wordRange))
                this.location = await this.findLocationByExplicitWith(document, wordRange);
            else
                this.location = await this.findLocationByImplicitWith(document, wordRange);
        } else if (wordRange.start.character > '.Rec.'.length && document.getText(new Range(wordRange.start.translate(0, -5), wordRange.start)).match(/.\bRec\./i)) {
            this.location = await this.findLocationByImplicitWith(document, wordRange);
        } else
            this.location = await this.findLocationByMemberAccess(document, wordRange);
        return this.location !== undefined;
    }
    async getTriggeredNodeLocations(): Promise<Location[]> {
        if (!this.location)
            return [];
        let locations: Location[] = [];

        let tableName: string | undefined = await this.getTableName(this.location);
        if (tableName) {
            let eventSubscribersNodes: Location[] = await this.getEventSubscriberNodes(tableName);
            locations = locations.concat(eventSubscribersNodes);

            let tableExtensionTriggers: Location[] = await this.getTriggersOfTableExtensions(tableName);
            locations = locations.concat(tableExtensionTriggers);
        }

        let triggerOfBaseTable: Location | undefined = await this.getTriggerOfBaseTable(this.location);
        if (triggerOfBaseTable)
            locations.push(triggerOfBaseTable);

        return locations;
    }
    async existsExplicitWith(document: TextDocument, wordRange: Range): Promise<boolean> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let withStatement: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(wordRange.start, [FullSyntaxTreeNodeKind.getWithStatement()]);
        return withStatement !== undefined;
    }
    async findLocationByExplicitWith(document: TextDocument, wordRange: Range): Promise<Location | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let withStatement: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(wordRange.start, [FullSyntaxTreeNodeKind.getWithStatement()]);
        if (withStatement) {
            let identifierTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(withStatement, FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
            let identifierRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            if (document.getText(identifierRange).toLowerCase() == 'rec')
                return this.findLocationByImplicitWith(document, wordRange);
            else {
                let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, identifierRange.start);
                if (locations && locations.length == 1) {
                    let lineOfVariableDeclaration: number = locations[0].range.start.line;
                    let variableDeclarationText: string = document.lineAt(lineOfVariableDeclaration).text;
                    let index: number = variableDeclarationText.toLowerCase().indexOf('record ', locations[0].range.start.character);
                    if (index > 0) {
                        locations = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, new Position(lineOfVariableDeclaration, index + 'record '.length));
                        if (locations)
                            return locations[0];
                    }
                }
            }
        }
        return undefined;
    }
    async findLocationByImplicitWith(document: TextDocument, wordRange: Range): Promise<Location | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let objectTreeNode: ALFullSyntaxTreeNode | undefined = SyntaxTreeExt.getObjectTreeNode(syntaxTree, wordRange.start);
        if (objectTreeNode) {
            switch (objectTreeNode.kind) {
                case FullSyntaxTreeNodeKind.getTableObject():
                    return new Location(document.uri, DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(objectTreeNode.fullSpan)));
                case FullSyntaxTreeNodeKind.getPageObject():
                case FullSyntaxTreeNodeKind.getRequestPage():
                case FullSyntaxTreeNodeKind.getPageExtensionObject():
                case FullSyntaxTreeNodeKind.getTableExtensionObject():
                case FullSyntaxTreeNodeKind.getCodeunitObject():
                    let tableLocation: Location | undefined = await ALFullSyntaxTreeNodeExt.getBaseTableLocation(document, objectTreeNode);
                    if (tableLocation)
                        return tableLocation;
                    break;
            }
        }
        return undefined;
    }
    async findLocationByMemberAccess(document: TextDocument, wordRange: Range): Promise<Location | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let treeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(wordRange.start.translate(0, -1), [FullSyntaxTreeNodeKind.getArrayIndexExpression(), FullSyntaxTreeNodeKind.getIdentifierName()]);
        if (treeNode) {
            let identifierTreeNode: ALFullSyntaxTreeNode;
            if (treeNode.kind == FullSyntaxTreeNodeKind.getArrayIndexExpression() && treeNode.childNodes)
                identifierTreeNode = treeNode.childNodes[0];
            else
                identifierTreeNode = treeNode;
            let identifierRange: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan));
            let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, identifierRange.start);
            if (locations && locations.length == 1) {
                let lineOfVariableDeclaration: number = locations[0].range.start.line;
                let variableDeclarationText: string = document.lineAt(lineOfVariableDeclaration).text;
                let index: number = variableDeclarationText.toLowerCase().indexOf('record ', locations[0].range.start.character);
                if (index > 0) {
                    locations = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, new Position(lineOfVariableDeclaration, index + 'record '.length));
                    if (locations)
                        return locations[0];

                }
            }
        }
        return undefined;
    }
    async getTriggersOfTableExtensions(tableName: string): Promise<Location[]> {
        let documents: TextDocument[] = await WorkspaceUtils.getTableExtensions(tableName);
        let tableExtensionTriggerLocations: Location[] = [];
        for (const document of documents) {
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let triggerTreeNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTriggerDeclaration());
            for (let n = 0; n < triggerTreeNodes.length; n++) {
                let identifierTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(triggerTreeNodes[n], FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
                let identifierRange: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
                let triggerName: string = document.getText(identifierRange);
                let validTriggers: string[] = [
                    'on' + this.builtInFunction?.toLowerCase(),
                    'onbefore' + this.builtInFunction?.toLowerCase(),
                    'onafter' + this.builtInFunction?.toLowerCase()
                ]
                if (validTriggers.includes(triggerName.toLowerCase()))
                    tableExtensionTriggerLocations.push(new Location(document.uri, identifierRange))
            }
        }
        return tableExtensionTriggerLocations;
    }
    async getTriggerOfBaseTable(location: Location): Promise<Location | undefined> {
        let document: TextDocument = await workspace.openTextDocument(location.uri);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let triggerTreeNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTriggerDeclaration());
        for (let i = 0; i < triggerTreeNodes.length; i++) {
            let identifierTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(triggerTreeNodes[i], FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
            let identifierRange: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
            let triggerName: string = document.getText(identifierRange);
            if (triggerName.toLowerCase() == 'on' + this.builtInFunction?.toLowerCase())
                return new Location(document.uri, identifierRange);
        }
        return undefined;
    }
    async getTableName(location: Location): Promise<string | undefined> {
        let document: TextDocument = await workspace.openTextDocument(location.uri);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let tableTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(location.range.start, [FullSyntaxTreeNodeKind.getTableObject()]);
        if (tableTreeNode)
            return ALFullSyntaxTreeNodeExt.getIdentifierValue(document, tableTreeNode, true);
    }
    async getEventSubscriberNodes(tableNameToSearch: string): Promise<Location[]> {
        if (!this.builtInFunction)
            return [];
        tableNameToSearch = tableNameToSearch.replace(/^"(.*)"$/, '$1')
        let validEvents: string[] = ['onbefore' + this.builtInFunction.toLowerCase() + 'event', 'onafter' + this.builtInFunction.toLowerCase() + 'event'];
        let locations: { uri: Uri, methodName: string }[] = await WorkspaceUtils.getEventSubscribers(tableNameToSearch, validEvents);
        let validEventSubscribers: Location[] = [];
        for (const location of locations) {
            let newEventNodes: ALFullSyntaxTreeNode[] = await this.getRelatedSyntaxTreeNodes(location);
            let fileContent: string = readFileSync(location.uri.fsPath, { encoding: 'utf8' })
            let fileLines: string[] = fileContent.split(DocumentUtils.getEolByContent(fileContent))
            for (const newEventNode of newEventNodes)
                validEventSubscribers.push(new Location(location.uri, DocumentUtils.trimRange2(fileLines, TextRangeExt.createVSCodeRange(newEventNode.fullSpan))));
        }
        return validEventSubscribers;
    }


    private async getRelatedSyntaxTreeNodes(location: { uri: Uri, methodName: string }): Promise<ALFullSyntaxTreeNode[]> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance2(location.uri.fsPath, readFileSync(location.uri.fsPath, { encoding: 'utf8' }));
        let methodNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getMethodDeclaration());
        let validNodes: ALFullSyntaxTreeNode[] = methodNodes.filter(methodNode => methodNode.name?.toLowerCase() == location.methodName.toLowerCase())
        for (let i = 0; i < validNodes.length; i++)
            validNodes[i] = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(validNodes[i], FullSyntaxTreeNodeKind.getIdentifierName(), false)!
        return validNodes;
    }
}