import { commands, Location, Position, Range, TextDocument, Uri, workspace } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { SyntaxTreeExt } from "../AL Code Outline Ext/syntaxTreeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import * as ALObjectDesigner from '../ALObjectDesigner/api';
import { ObjectDesignerExt } from "../ALObjectDesigner/ObjectDesignerExt";
import { DocumentUtils } from "../Utils/documentUtils";
import { BuiltInFunctionDefinitionInterface } from "./BuiltInFunctionDefinitionInterface";

export class BuiltInTableDefinitionReference implements BuiltInFunctionDefinitionInterface {
    location: Location | undefined;
    builtInFunction: string = '';
    getBuiltInFunctionsSupported(): string[] {
        return ['insert', 'modify', 'delete', 'rename'];
    }
    setBuiltInFunction(builtInFunction: string) {
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
        let documents: TextDocument[] = await ObjectDesignerExt.getTableExtensions(tableName);
        let tableExtensionTriggerLocations: Location[] = [];
        for (const document of documents) {
            let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
            let triggerTreeNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getTriggerDeclaration());
            for (let n = 0; n < triggerTreeNodes.length; n++) {
                let identifierTreeNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(triggerTreeNodes[n], FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
                let identifierRange: Range = TextRangeExt.createVSCodeRange(identifierTreeNode.fullSpan);
                let triggerName: string = document.getText(identifierRange);
                let validTriggers: string[] = [
                    'on' + this.builtInFunction.toLowerCase(),
                    'onbefore' + this.builtInFunction.toLowerCase(),
                    'onafter' + this.builtInFunction.toLowerCase()
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
            if (triggerName.toLowerCase() == 'on' + this.builtInFunction.toLowerCase())
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
        let api: ALObjectDesigner.ALObjectDesignerAPI = await ALObjectDesigner.ALObjectDesigner.getApi();
        let eventList: ALObjectDesigner.CollectorItem[] | undefined = api.ALPanel.eventList;
        if (!eventList)
            return [];

        let allEventSubscribersOfTable: ALObjectDesigner.CollectorItem[] = eventList.filter(object =>
            !object.EventPublisher &&
            object.EventType && object.EventType.toLowerCase() == 'eventsubscriber' &&
            object.TargetObjectType && object.TargetObjectType.toLowerCase() == 'table' &&
            object.TargetObject && object.TargetObject.trim().replace(/^"?([^"]+)"?$/, '$1').toLowerCase() == tableNameToSearch.toLowerCase()
            //&& object.EventPublisherName
        );
        let validEventSubscribers: Location[] = [];
        for (let i = 0; i < allEventSubscribersOfTable.length; i++) {
            let document: TextDocument;
            if (allEventSubscribersOfTable[i].FsPath == '') {
                try {
                    let objectRow: ALObjectDesigner.CollectorItem = allEventSubscribersOfTable[i];
                    let uri = Uri.parse(`alObjectDesignerDal://symbol/${objectRow.Type}${objectRow.Id > 0 ? ` ${objectRow.Id} ` : ''}${objectRow.Name.replace(/\//g, "_")} - ${objectRow.Application.replace(/[^\w]/g, "_")}.al#${JSON.stringify({ Type: objectRow.Type, Name: objectRow.Name })}`);
                    document = await workspace.openTextDocument(uri);
                } catch {
                    continue;
                }
            } else
                document = await workspace.openTextDocument(allEventSubscribersOfTable[i].FsPath);

            let validEventSubscriberIdentifier: ALFullSyntaxTreeNode | undefined = await this.checkIfOnBefore_OnAfterEventSubscriber(document, allEventSubscribersOfTable[i].EventName);
            if (validEventSubscriberIdentifier)
                validEventSubscribers.push(new Location(document.uri, DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(validEventSubscriberIdentifier.fullSpan))));
        }
        return validEventSubscribers;
    }


    private async checkIfOnBefore_OnAfterEventSubscriber(doc: TextDocument, eventSubscriberName: string): Promise<ALFullSyntaxTreeNode | undefined> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(doc);
        let methodNodes: ALFullSyntaxTreeNode[] = syntaxTree.collectNodesOfKindXInWholeDocument(FullSyntaxTreeNodeKind.getMethodDeclaration());
        for (let m = 0; m < methodNodes.length; m++) {
            let identifierNode: ALFullSyntaxTreeNode = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodNodes[m], FullSyntaxTreeNodeKind.getIdentifierName(), false) as ALFullSyntaxTreeNode;
            if (doc.getText(TextRangeExt.createVSCodeRange(identifierNode.fullSpan)).toLowerCase() == eventSubscriberName.toLowerCase()) {
                let memberAttributeNodes: ALFullSyntaxTreeNode[] = [];
                ALFullSyntaxTreeNodeExt.collectChildNodes(methodNodes[m], FullSyntaxTreeNodeKind.getMemberAttribute(), false, memberAttributeNodes);
                let eventSubscriberNode: ALFullSyntaxTreeNode | undefined = memberAttributeNodes.find(attr => attr.childNodes && doc.getText(TextRangeExt.createVSCodeRange(attr.childNodes[0].fullSpan)).toLowerCase() == 'eventsubscriber');
                if (eventSubscriberNode) {
                    let argumentList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(eventSubscriberNode, FullSyntaxTreeNodeKind.getAttributeArgumentList(), false);
                    if (argumentList && argumentList.childNodes) {
                        let validEvents: string[] = ['onbefore' + this.builtInFunction?.toLowerCase() + 'event', 'onafter' + this.builtInFunction?.toLowerCase() + 'event'];
                        let eventName: string = doc.getText(TextRangeExt.createVSCodeRange(argumentList.childNodes[2].fullSpan)).toLowerCase().replace(/'(\w+)'/, '$1');
                        if (validEvents.includes(eventName))
                            return identifierNode;
                    }
                }
            }
        }
        return undefined;
    }
}