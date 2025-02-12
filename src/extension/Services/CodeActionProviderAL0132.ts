import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ALObject } from '../Entities/alObject';
import { ALProcedure } from '../Entities/alProcedure';
import { ALSourceCodeHandler } from "../Utils/alSourceCodeHandler";
import { CreateProcedure } from '../Create Procedure/Procedure Creator/CreateProcedure';
import { CreateProcedureAL0132 } from '../Create Procedure/Procedure Creator/CreateProcedureAL0132';
import { ICodeActionProvider } from "./ICodeActionProvider";
import { WorkspaceUtils } from '../Utils/workspaceUtils';
import { CreateProcedureAL0132IntegrationEvent } from '../Create Procedure/Procedure Creator/CreateProcedureAL0132IntegrationEvent';
import { CreateProcedureAL0132BusinessEvent } from '../Create Procedure/Procedure Creator/CreateProcedureAL0132BusinessEvent';
import { CreateProcedureAL0132TryFunction } from "../Create Procedure/Procedure Creator/CreateProcedureAL0132TryFunction";
import { Err } from '../Utils/Err';
import { TextDocument, Diagnostic, CodeAction, workspace, CodeActionKind, window, commands, Location, CustomExecution, TextEditorCursorStyle, WorkspaceFolder, CodeActionContext, CodeActionTriggerKind } from "vscode";
import { Command } from "../Entities/Command";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { DocumentUtils } from "../Utils/documentUtils";
import { ALObjectParser } from "../Entity Parser/alObjectParser";
import { AccessModifier } from "../Entities/accessModifier";
import { Config } from "../Utils/config";

export class CodeActionProviderAL0132 implements ICodeActionProvider {
    syntaxTree: SyntaxTree | undefined;
    document: TextDocument;
    diagnostic: Diagnostic;
    createProcedureAL0132: CreateProcedureAL0132 | undefined;
    constructor(document: TextDocument, diagnostic: Diagnostic) {
        this.document = document;
        this.diagnostic = diagnostic;
    }
    async considerLine(context: CodeActionContext): Promise<boolean> {
        if (context.only && !context.only.contains(CodeActionKind.QuickFix))
            return false;
        if (context.triggerKind == CodeActionTriggerKind.Automatic)
            if (!Config.getExecuteCodeActionsAutomatically(this.document.uri))
                return false;
        this.syntaxTree = await SyntaxTree.getInstance(this.document);
        if (await new ALSourceCodeHandler(this.document).isInvocationExpression(this.diagnostic.range)) {
            this.createProcedureAL0132 = new CreateProcedureAL0132(this.document, this.diagnostic);
            let objectOfNewProcedure: ALObject = await this.createProcedureAL0132.getObject();
            if (this.canObjectContainProcedures(objectOfNewProcedure)) {
                return true;
            }
        }
        return false;
    }

    async createCodeActions(): Promise<CodeAction[]> {
        if (!this.createProcedureAL0132) {
            Err._throw('considerLine has to be called first.');
        }
        let codeActions: CodeAction[] = [];
        let procedure: ALProcedure = await CreateProcedure.createProcedure(this.createProcedureAL0132);
        if (!this.isValidDocument(procedure))
            return []
        const codeActionProcedure: CodeAction = await this.createCodeAction('Create procedure ' + procedure.name, procedure, false);
        const codeActionProcedureWithPublishers: CodeAction = await this.createCodeAction(`Create procedure ${procedure.name} with advanced options`, procedure, true);

        if (procedure.ObjectOfProcedure.type.toLowerCase() == 'page') {
            let codeActionsSourceTable: CodeAction[] | undefined = await this.createCodeActionSourceRec(procedure)
            if (codeActionsSourceTable)
                for (const codeActionSourceTable of codeActionsSourceTable)
                    codeActions.push(codeActionSourceTable)
        }

        let prefixes: string[] | undefined = await WorkspaceUtils.findValidAppSourcePrefixes(this.document.uri);
        let regexPatternPublishers: RegExp = prefixes ? new RegExp("^(" + prefixes.join('|') + "|" + prefixes.join('_|') + "_)?On[A-Za-z].*$") : new RegExp("^On[A-Za-z].*$");
        let regexPatternTryFunction: RegExp = prefixes ? new RegExp("^(" + prefixes.join('|') + "|" + prefixes.join('_|') + "_)?Try[A-Za-z].*$") : new RegExp("^Try[A-Za-z].*$");
        if (procedure.name.match(regexPatternTryFunction)) {
            let createProcedureAL0132TryFunction: CreateProcedureAL0132TryFunction = new CreateProcedureAL0132TryFunction(this.document, this.diagnostic);
            let tryFunction: ALProcedure = await CreateProcedure.createProcedure(createProcedureAL0132TryFunction);
            let codeActionTryFunction: CodeAction = await this.createCodeAction(`Create procedure ${tryFunction.name} as TryFunction`, tryFunction, false);
            codeActionTryFunction.isPreferred = true;
            codeActions.push(codeActionTryFunction);
        } else if (procedure.name.match(regexPatternPublishers)) {
            let createProcedureAL0132IntegrationEvent: CreateProcedureAL0132IntegrationEvent = new CreateProcedureAL0132IntegrationEvent(this.document, this.diagnostic);
            let integrationEvent: ALProcedure = await CreateProcedure.createProcedure(createProcedureAL0132IntegrationEvent);
            let codeActionIntegrationEvent: CodeAction = await this.createCodeAction('Create IntegrationEvent Publisher ' + integrationEvent.name, integrationEvent, false);
            codeActionIntegrationEvent.isPreferred = true;
            codeActions.push(codeActionIntegrationEvent);

            let createProcedureAL0132BusinessEvent: CreateProcedureAL0132BusinessEvent = new CreateProcedureAL0132BusinessEvent(this.document, this.diagnostic);
            let businessEvent: ALProcedure = await CreateProcedure.createProcedure(createProcedureAL0132BusinessEvent);
            let codeActionBusinessEvent: CodeAction = await this.createCodeAction('Create BusinessEvent Publisher ' + businessEvent.name, businessEvent, false);//businessEvent, 'Create BusinessEvent Publisher ' + businessEvent.name, this.document, this.diagnostic);
            codeActions.push(codeActionBusinessEvent);
        } else
            codeActionProcedure.isPreferred = true
        codeActions.push(codeActionProcedure)
        codeActions.push(codeActionProcedureWithPublishers)
        return codeActions;
    }
    async createCodeActionSourceRec(procedure: ALProcedure): Promise<CodeAction[] | undefined> {
        let sourceSyntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document)
        let node = sourceSyntaxTree.findTreeNode(this.diagnostic.range.start, [FullSyntaxTreeNodeKind.getMemberAccessExpression(), FullSyntaxTreeNodeKind.getInvocationExpression()]);
        if (!node || !node.childNodes)
            return
        if (node.kind == FullSyntaxTreeNodeKind.getMemberAccessExpression()) {
            if (node.childNodes[0].identifier?.toLowerCase() != 'rec')
                return
        } else {
            let appJsonContent: any | undefined = await WorkspaceUtils.findAppJson(this.document.uri)
            if (appJsonContent && appJsonContent.features) {
                if (appJsonContent.features.includes('NoImplicitWith'))
                    return
            }
        }

        let procCopy: ALProcedure = Object.create(procedure); //copy
        let document: TextDocument = await workspace.openTextDocument(procCopy.ObjectOfProcedure.documentUri!)
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document)
        let objects = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(syntaxTree.getRoot(), FullSyntaxTreeNodeKind.getAllObjectKinds(), false)
        let object = objects.find(obj => obj.name?.removeQuotes().toLowerCase() == procCopy.ObjectOfProcedure.name.removeQuotes().toLowerCase())
        if (!object)
            return
        let propertyList: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(object, [FullSyntaxTreeNodeKind.getPropertyList()], false).pop()
        if (!propertyList || !propertyList.childNodes)
            return
        let properties: ALFullSyntaxTreeNode[] = ALFullSyntaxTreeNodeExt.collectChildNodesOfKinds(propertyList, [FullSyntaxTreeNodeKind.getProperty()], false)
        let sourceTableProperty: ALFullSyntaxTreeNode | undefined = properties.find(prop => prop.name?.toLowerCase() == 'sourcetable')
        if (!sourceTableProperty || !sourceTableProperty.childNodes)
            return
        let rangeOfObjectReference = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(sourceTableProperty.childNodes[1].fullSpan))
        let locations: Location[] | undefined = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, rangeOfObjectReference.start)
        if (locations && !locations[0].uri.fsPath.endsWith('.dal')) {
            let sourceTableDoc = await workspace.openTextDocument(locations[0].uri)
            let syntaxTreeSourceTable: SyntaxTree = await SyntaxTree.getInstance(sourceTableDoc)
            let objectNode: ALFullSyntaxTreeNode | undefined = syntaxTreeSourceTable.findTreeNode(locations[0].range.start, [FullSyntaxTreeNodeKind.getTableObject()])
            if (!objectNode)
                return
            let tableALObject: ALObject = ALObjectParser.parseObjectTreeNodeToALObject(sourceTableDoc, objectNode)
            procCopy.ObjectOfProcedure = tableALObject
            procCopy.accessModifier = AccessModifier.internal
            return [
                await this.createCodeAction(`Create procedure ${procCopy.name} on source table`, procCopy, false),
                await this.createCodeAction(`Create procedure ${procCopy.name} on source table with advanced options`, procCopy, true)
            ]
        }
    }


    private canObjectContainProcedures(alObject: ALObject) {
        switch (alObject.type.toString().toLowerCase()) {
            case "enum":
                return false;
            default:
                return true;
        }
    }
    private isValidDocument(procedureToCreate: ALProcedure): boolean {
        if (procedureToCreate.ObjectOfProcedure.documentUri!.fsPath.endsWith('dal'))
            return false
        return true
    }
    private async createCodeAction(msg: string, procedureToCreate: ALProcedure, advancedProcedureCreation: boolean): Promise<CodeAction> {
        let otherDocument: TextDocument = await workspace.openTextDocument(procedureToCreate.ObjectOfProcedure.documentUri!);
        let codeActionToCreateProcedure: CodeAction = this.createFixToCreateProcedure(msg, procedureToCreate, otherDocument, new Location(this.document.uri, this.diagnostic.range), advancedProcedureCreation);
        return codeActionToCreateProcedure;
    }

    private createFixToCreateProcedure(msg: string, procedure: ALProcedure, document: TextDocument, sourceLocation: Location, advancedProcedureCreation: boolean): CodeAction {
        const codeAction = new CodeAction(msg, CodeActionKind.QuickFix);
        codeAction.command = {
            command: Command.createProcedureCommand,
            title: msg,
            arguments: [document, procedure, sourceLocation, { suppressUI: false, advancedProcedureCreation: advancedProcedureCreation }]
        };
        return codeAction;
    }
}