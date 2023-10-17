import { commands, Diagnostic, Location, Position, QuickPickItem, Range, Selection, SnippetString, TextDocument, TextEditor, window, workspace, WorkspaceEdit } from 'vscode';
import { ALFullSyntaxTreeNodeExt } from '../AL Code Outline Ext/alFullSyntaxTreeNodeExt';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { TextRangeExt } from '../AL Code Outline Ext/textRangeExt';
import { ALFullSyntaxTreeNode } from '../AL Code Outline/alFullSyntaxTreeNode';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import * as Telemetry from '../ApplicationInsights/applicationInsights';
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { ALProcedure } from '../Entities/alProcedure';
import { Command } from '../Entities/Command';
import { PublisherToAdd } from '../Services/CodeActionProviderModifyProcedureContent';
import { ALSourceCodeHandler } from '../Utils/alSourceCodeHandler';
import { Config } from '../Utils/config';
import { DocumentUtils } from '../Utils/documentUtils';
import { Err } from '../Utils/Err';
import { WorkspaceEditUtils } from '../Utils/WorkspaceEditUtils';
import { CreateProcedureAL0499ConfirmHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499ConfirmHandler';
import { CreateProcedureAL0499FilterPageHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499FilterPageHandler';
import { CreateProcedureAL0499HyperlinkHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499HyperlinkHandler';
import { CreateProcedureAL0499MessageHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499MessageHandler';
import { CreateProcedureAL0499ModalPageHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499ModalPageHandler';
import { CreateProcedureAL0499PageHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499PageHandler';
import { CreateProcedureAL0499RecallNotificationHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499RecallNotificationHandler';
import { CreateProcedureAL0499ReportHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499ReportHandler';
import { CreateProcedureAL0499RequestPageHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499RequestPageHandler';
import { CreateProcedureAL0499SendNotificationHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499SendNotificationHandler';
import { CreateProcedureAL0499SessionSettingsHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499SessionSettingsHandler';
import { CreateProcedureAL0499StrMenuHandler } from './Procedure Creator/AL0499 Specifications/CreateProcedureAL0499StrMenuHandler';
import { SupportedHandlers } from './Procedure Creator/AL0499 Specifications/supportedHandlers';
import { CreateProcedure } from './Procedure Creator/CreateProcedure';
import { ICreateProcedure } from './Procedure Creator/ICreateProcedure';
export class CreateProcedureCommands {

    static async addHandler(document: TextDocument, diagnostic: Diagnostic): Promise<any> {
        let supportedHandlers: string[] = [];
        for (var enumMember in SupportedHandlers) {
            supportedHandlers.push(enumMember.toString());
        }
        let handlerToAdd: string | undefined = await window.showQuickPick(supportedHandlers);
        if (!handlerToAdd) {
            return;
        }
        let createProcedure: ICreateProcedure = CreateProcedureCommands.getCreateProcedureImplementation(handlerToAdd, document, diagnostic);
        let procedure: ALProcedure = await CreateProcedure.createProcedure(createProcedure);
        commands.executeCommand(Command.createProcedureCommand, document, procedure, new Location(document.uri, diagnostic.range), { suppressUI: false, advancedProcedureCreation: false });
    }
    private static getCreateProcedureImplementation(handlerToAdd: string, document: TextDocument, diagnostic: Diagnostic): ICreateProcedure {
        switch (handlerToAdd) {
            case SupportedHandlers.ConfirmHandler:
                return new CreateProcedureAL0499ConfirmHandler(document, diagnostic);
            case SupportedHandlers.FilterPageHandler:
                return new CreateProcedureAL0499FilterPageHandler(document, diagnostic);
            case SupportedHandlers.HyperlinkHandler:
                return new CreateProcedureAL0499HyperlinkHandler(document, diagnostic);
            case SupportedHandlers.MessageHandler:
                return new CreateProcedureAL0499MessageHandler(document, diagnostic);
            case SupportedHandlers.ModalPageHandler:
                return new CreateProcedureAL0499ModalPageHandler(document, diagnostic);
            case SupportedHandlers.PageHandler:
                return new CreateProcedureAL0499PageHandler(document, diagnostic);
            case SupportedHandlers.RecallNotificationHandler:
                return new CreateProcedureAL0499RecallNotificationHandler(document, diagnostic);
            case SupportedHandlers.ReportHandler:
                return new CreateProcedureAL0499ReportHandler(document, diagnostic);
            case SupportedHandlers.RequestPageHandler:
                return new CreateProcedureAL0499RequestPageHandler(document, diagnostic);
            case SupportedHandlers.SendNotificationHandler:
                return new CreateProcedureAL0499SendNotificationHandler(document, diagnostic);
            case SupportedHandlers.SessionSettingsHandler:
                return new CreateProcedureAL0499SessionSettingsHandler(document, diagnostic);
            case SupportedHandlers.StrMenuHandler:
                return new CreateProcedureAL0499StrMenuHandler(document, diagnostic);
            default:
                Err._throw('Handler ' + handlerToAdd + ' is not supported.');
        }
    }

    public static async addProcedureToSourceCode(document: TextDocument, procedure: ALProcedure, sourceLocation: Location, options: { suppressUI: boolean, advancedProcedureCreation: boolean }) {
        let appInsightsEntryProperties: any = {};

        let addOnBeforeOnAfterPublishers: boolean = false;
        let askForProcedurePosition: boolean = false;
        if (options.advancedProcedureCreation && !options.suppressUI) {
            const defaultAdvancedOptions = Config.getConfig(document.uri).get('defaultAdvancedOptions', []);
            const addPublisherLbl = 'Add OnBefore and OnAfter publishers to the new procedure'
            const placeProcedureManuallyLbl = 'Place procedure manually';
            const addPublishers = { label: addPublisherLbl, picked: defaultAdvancedOptions.some(defaultOption => defaultOption === addPublisherLbl) }
            const placeProcedureManually = { label: placeProcedureManuallyLbl, picked: defaultAdvancedOptions.some(defaultOption => defaultOption === placeProcedureManuallyLbl) }
            const items: QuickPickItem[] = [addPublishers, placeProcedureManually]
            const userResponse = await window.showQuickPick(items, { title: 'Please choose your advanced options (preselected based on your settings) Hint: Use arrow keys, space and enter keys to select options.', canPickMany: true })
            addOnBeforeOnAfterPublishers = userResponse ? userResponse.some(response => response.label === addPublishers.label) : false
            askForProcedurePosition = userResponse ? userResponse.some(response => response.label === placeProcedureManually.label) : false
        }

        let edit: { position: Position; workspaceEdit: WorkspaceEdit | undefined; snippetString: SnippetString | undefined; selectionToPlaceCursor: Selection | undefined; rangeToReveal: Range | undefined } | undefined =
            await this.getEditToAddProcedureToSourceCode(document, procedure, sourceLocation, options, askForProcedurePosition, appInsightsEntryProperties);
        if (!edit)
            return

        Telemetry.trackEvent(Telemetry.EventName.CreateProcedure, appInsightsEntryProperties)
        if (edit.workspaceEdit) {
            if (addOnBeforeOnAfterPublishers) {
                await WorkspaceEditUtils.applyWorkspaceEditWithoutUndoStack(edit.workspaceEdit);
                const syntaxTree = await SyntaxTree.getInstance(document);
                const methodNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(edit.workspaceEdit.get(document.uri)[0].range.start.translate(1, 0), [FullSyntaxTreeNodeKind.getMethodDeclaration()])
                if (methodNode) {
                    const identifierNode: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodNode, FullSyntaxTreeNodeKind.getIdentifierName(), false)
                    if (identifierNode) {
                        const methodIdentifierRange = TextRangeExt.createVSCodeRange(identifierNode.fullSpan)
                        const methodIdentifierLocation = new Location(document.uri, methodIdentifierRange)
                        await commands.executeCommand(Command.modifyProcedureContent, document, methodIdentifierRange, PublisherToAdd.OnBefore, methodIdentifierLocation, { suppressUI: true })
                        await commands.executeCommand(Command.modifyProcedureContent, document, methodIdentifierRange, PublisherToAdd.OnAfter, methodIdentifierLocation, { suppressUI: true })
                    }
                }
            } else
                await workspace.applyEdit(edit.workspaceEdit!);
        }

        if (edit.snippetString || edit.selectionToPlaceCursor || edit.rangeToReveal) {
            let editor: TextEditor = await CreateProcedureCommands.getEditor(document);
            if (edit.snippetString)
                editor.insertSnippet(edit.snippetString, edit.position)
            if (edit.selectionToPlaceCursor)
                editor.selection = edit.selectionToPlaceCursor
            if (edit.rangeToReveal)
                editor.revealRange(edit.rangeToReveal);
        }
    }
    static async getEditToAddProcedureToSourceCode(document: TextDocument, procedure: ALProcedure, sourceLocation: Location, options: { suppressUI: boolean, advancedProcedureCreation: boolean }, askForProcedurePosition: boolean, appInsightsEntryProperties: any): Promise<{ position: Position; workspaceEdit: WorkspaceEdit | undefined; snippetString: SnippetString | undefined; selectionToPlaceCursor: Selection | undefined; rangeToReveal: Range | undefined } | undefined> {
        const alSourceCodeHandler = new ALSourceCodeHandler(document)

        let position: Position | undefined = await alSourceCodeHandler.getPositionToInsertProcedure(procedure, sourceLocation, askForProcedurePosition, appInsightsEntryProperties);
        if (!position)
            return
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);

        if (procedure.isReturnTypeRequired() && !options.suppressUI) {
            appInsightsEntryProperties.askUserForMandatoryReturnType = true;
            procedure.returnType = await CreateProcedureCommands.askUserForMandatoryReturnType()
        }

        let isInterface: boolean = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getInterface()]) !== undefined;
        let createProcedure: CreateProcedure = new CreateProcedure();
        let rangeToReveal: Range | undefined
        let selectionToPlaceCursor: Selection | undefined
        let snippetString: SnippetString | undefined
        let workspaceEdit: WorkspaceEdit | undefined
        appInsightsEntryProperties.containsSnippet = procedure.getContainsSnippet();
        const eol = DocumentUtils.getEolByTextDocument(document);
        if (procedure.getJumpToCreatedPosition() && procedure.getContainsSnippet()) {
            let textToInsert: string = createProcedure.createProcedureDefinition(procedure, false, isInterface, eol);
            textToInsert = createProcedure.addLineBreaksToProcedureCall(document, position, textToInsert, isInterface);

            const newLineMatches: RegExpMatchArray | null = textToInsert.match(/\r?\n/g)
            const linesInserted = newLineMatches ? newLineMatches.length : 0
            snippetString = new SnippetString(textToInsert);
            rangeToReveal = new Range(position, position.translate(linesInserted, undefined))
        } else {
            let textToInsert = createProcedure.createProcedureDefinition(procedure, true, isInterface, eol);
            textToInsert = createProcedure.addLineBreaksToProcedureCall(document, position, textToInsert, isInterface);
            workspaceEdit = new WorkspaceEdit();
            workspaceEdit.insert(document.uri, position, textToInsert);
            const newLineMatches: RegExpMatchArray | null = textToInsert.match(/\r?\n/g)
            const linesInserted = newLineMatches ? newLineMatches.length : 0
            if (procedure.getJumpToCreatedPosition() && !procedure.getContainsSnippet()) {
                let lineOfBodyStart: number | undefined = createProcedure.getLineOfBodyStart();
                if (lineOfBodyStart !== undefined) {
                    let lineToPlaceCursor: number = lineOfBodyStart + position.line;
                    let character: number
                    if (lineToPlaceCursor >= document.lineCount)
                        character = 8
                    else
                        character = document.lineAt(lineToPlaceCursor).firstNonWhitespaceCharacterIndex;
                    let positionToPlaceCursor: Position = new Position(lineToPlaceCursor, character);
                    selectionToPlaceCursor = new Selection(positionToPlaceCursor, positionToPlaceCursor);
                    rangeToReveal = new Range(position, position.translate(linesInserted, undefined));
                }
            }
        }
        return { position, workspaceEdit, snippetString, selectionToPlaceCursor, rangeToReveal }
    }

    private static async askUserForMandatoryReturnType(): Promise<string | undefined> {
        let returnType: string | undefined = await window.showQuickPick(
            [
                'Text',
                'Decimal',
                'Boolean',
                'BigInteger',
                'Byte',
                'Char',
                'Code',
                'Date',
                'DateTime',
                'Duration',
                'Enum',
                'Integer',
                'Guid',
                'Option',
                'Time'
            ],
            {
                placeHolder: 'Choose the return type of the procedure'
            }
        );
        if (returnType) {
            switch (returnType) {
                case 'Text':
                case 'Code':
                    let length: string | undefined = await window.showInputBox({
                        placeHolder: 'Specify the length',
                        validateInput: CreateProcedureCommands.checkNumbersOnly
                    })
                    if (length)
                        returnType += '[' + length + ']'
                    break;
                case 'Enum':
                    let api: any = (await ALCodeOutlineExtension.getInstance()).getAPI()
                    let enums: string[] = await api.alLangProxy.getEnumList(undefined)
                    if (enums.length > 0) {
                        let chosenEnum: string | undefined = await window.showQuickPick(
                            enums,
                            {
                                placeHolder: 'Choose the enum type'
                            }
                        );
                        if (chosenEnum)
                            returnType += ' "' + chosenEnum + '"'
                    }
                    break;
            }
        }
        return returnType
    }
    private static checkNumbersOnly(value: string): string {
        if (/[^\d]/.test(value))
            return value.replace(/\d/g, '')
        else
            return ''
    }

    private static async getEditor(document: TextDocument) {
        let editor: TextEditor;
        if (window.activeTextEditor && window.activeTextEditor.document === document) {
            editor = window.activeTextEditor;
        }
        else {
            editor = await window.showTextDocument(document.uri);
        }
        return editor;
    }
}