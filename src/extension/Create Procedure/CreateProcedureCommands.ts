import * as vscode from 'vscode';
import { FullSyntaxTreeNodeKind } from '../AL Code Outline Ext/fullSyntaxTreeNodeKind';
import { SyntaxTree } from '../AL Code Outline/syntaxTree';
import { ALCodeOutlineExtension } from '../devToolsExtensionContext';
import { ALProcedure } from '../Entities/alProcedure';
import { ALSourceCodeHandler } from '../Utils/alSourceCodeHandler';
import { Err } from '../Utils/Err';
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
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
export class CreateProcedureCommands {

    public static createProcedureCommand: string = 'alcodeactions.createProcedure';
    public static createHandlerCommand: string = 'alcodeactions.createHandler';

    static async addHandler(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<any> {
        let supportedHandlers: string[] = [];
        for (var enumMember in SupportedHandlers) {
            supportedHandlers.push(enumMember.toString());
        }
        let handlerToAdd: string | undefined = await vscode.window.showQuickPick(supportedHandlers);
        if (!handlerToAdd) {
            return;
        }
        let createProcedure: ICreateProcedure = CreateProcedureCommands.getCreateProcedureImplementation(handlerToAdd, document, diagnostic);
        let procedure: ALProcedure = await CreateProcedure.createProcedure(createProcedure);
        vscode.commands.executeCommand(this.createProcedureCommand, document, diagnostic, procedure);
    }
    private static getCreateProcedureImplementation(handlerToAdd: string, document: vscode.TextDocument, diagnostic: vscode.Diagnostic): ICreateProcedure {
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

    public static async addProcedureToSourceCode(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, procedure: ALProcedure) {
        let lineNo: number | undefined = diagnostic.code?.toString() === SupportedDiagnosticCodes.AL0132.toString() ? undefined : diagnostic.range.start.line;
        let position: vscode.Position = await new ALSourceCodeHandler(document).getPositionToInsertProcedure(lineNo, procedure);
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);

        if (procedure.isReturnTypeRequired()) {
            procedure.returnType = await CreateProcedureCommands.askUserForMandatoryReturnType()
        }

        let isInterface: boolean = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getInterface()]) !== undefined;
        let createProcedure: CreateProcedure = new CreateProcedure();
        if (procedure.getJumpToCreatedPosition() && procedure.getContainsSnippet()) {
            let textToInsert = createProcedure.createProcedureDefinition(procedure, false, isInterface);
            textToInsert = createProcedure.addLineBreaksToProcedureCall(document, position, textToInsert, isInterface);
            let snippetString: vscode.SnippetString = new vscode.SnippetString(textToInsert);
            let editor: vscode.TextEditor = await CreateProcedureCommands.getEditor(document);
            editor.insertSnippet(snippetString, position);
        } else {
            let textToInsert = createProcedure.createProcedureDefinition(procedure, true, isInterface);
            textToInsert = createProcedure.addLineBreaksToProcedureCall(document, position, textToInsert, isInterface);
            let workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.insert(document.uri, position, textToInsert);
            await vscode.workspace.applyEdit(workspaceEdit);
            if (procedure.getJumpToCreatedPosition() && !procedure.getContainsSnippet()) {
                let lineOfBodyStart: number | undefined = createProcedure.getLineOfBodyStart();
                if (lineOfBodyStart !== undefined) {
                    let lineToPlaceCursor: number = lineOfBodyStart + position.line;
                    let positionToPlaceCursor: vscode.Position = new vscode.Position(lineToPlaceCursor, document.lineAt(lineToPlaceCursor).firstNonWhitespaceCharacterIndex);
                    let editor: vscode.TextEditor = await CreateProcedureCommands.getEditor(document);
                    editor.selection = new vscode.Selection(positionToPlaceCursor, positionToPlaceCursor);
                }
            }
        }
    }

    private static async askUserForMandatoryReturnType(): Promise<string | undefined> {
        let returnType: string | undefined = await vscode.window.showQuickPick(
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
                    let length: string | undefined = await vscode.window.showInputBox({
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
                        let chosenEnum: string | undefined = await vscode.window.showQuickPick(
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

    private static async getEditor(document: vscode.TextDocument) {
        let editor: vscode.TextEditor;
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document === document) {
            editor = vscode.window.activeTextEditor;
        }
        else {
            editor = await vscode.window.showTextDocument(document.uri);
        }
        return editor;
    }
}