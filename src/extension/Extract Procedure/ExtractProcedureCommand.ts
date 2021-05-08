import { commands, Location, Position, Range, TextDocument, window, workspace, WorkspaceEdit } from "vscode";
import { ALFullSyntaxTreeNodeExt } from "../AL Code Outline Ext/alFullSyntaxTreeNodeExt";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { TextRangeExt } from "../AL Code Outline Ext/textRangeExt";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { CreateProcedure } from "../Create Procedure/Procedure Creator/CreateProcedure";
import { ALProcedure } from "../Entities/alProcedure";
import { ALVariable } from "../Entities/alVariable";
import { Command } from "../Entities/Command";
import { RenameMgt } from "../renameMgt";
import { ALSourceCodeHandler } from "../Utils/alSourceCodeHandler";
import { Config, FindNewProcedureLocation } from "../Utils/config";
import { DocumentUtils } from "../Utils/documentUtils";

export class ExtractProcedureCommand {
    static async extract(document: TextDocument, procedureCallingText: string, procedure: ALProcedure, rangeExpanded: Range) {
        let callRename: boolean = true
        if (Config.getFindNewProcedureLocation(document.uri) == FindNewProcedureLocation["Sort by type, access modifier, name"]) {
            callRename = false
            procedureCallingText = await ExtractProcedureCommand.askForNewName(procedureCallingText, procedure);
        }

        let position: Position | undefined = await new ALSourceCodeHandler(document).getPositionToInsertProcedure(procedure);
        if (!position)
            return
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let isInterface: boolean = syntaxTree.findTreeNode(position, [FullSyntaxTreeNodeKind.getInterface()]) !== undefined;
        let createProcedure: CreateProcedure = new CreateProcedure();
        let textToInsert = createProcedure.createProcedureDefinition(procedure, true, isInterface);
        textToInsert = createProcedure.addLineBreaksToProcedureCall(document, position, textToInsert, isInterface);
        let workspaceEdit: WorkspaceEdit = new WorkspaceEdit();
        workspaceEdit.insert(document.uri, position, textToInsert);

        await this.removeLocalVariables(workspaceEdit, document, rangeExpanded.start, procedure.variables);
        workspaceEdit.replace(document.uri, rangeExpanded, procedureCallingText);
        await workspace.applyEdit(workspaceEdit);

        if (callRename)
            ExtractProcedureCommand.callRename(document);
    }
    private static async askForNewName(procedureCallingText: string, procedure: ALProcedure) {
        let newName: string | undefined = await window.showInputBox({ prompt: 'Enter the name for the new method.', placeHolder: RenameMgt.newProcedureName });
        if (!newName)
            newName = RenameMgt.newProcedureName;
        if (!/^\w+$/.test(newName) && !/^"[^"]+"$/.test(newName))
            newName = `"${newName}"`;
        procedureCallingText = newName + procedureCallingText.substr(RenameMgt.newProcedureName.length);
        procedure.name = newName;
        return procedureCallingText;
    }

    private static callRename(document: TextDocument) {
        let wordRange: Range | undefined = document.getWordRangeAtPosition(window.activeTextEditor!.selection.start)
        if (!wordRange)
            return
        let executeRenameAt: Position = wordRange.start

        commands.executeCommand(Command.renameCommand, new Location(document.uri, executeRenameAt));
    }

    private static async removeLocalVariables(edit: WorkspaceEdit, document: TextDocument, start: Position, variables: ALVariable[]) {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(document);
        let methodOrTriggerTreeNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(start, [FullSyntaxTreeNodeKind.getTriggerDeclaration(), FullSyntaxTreeNodeKind.getMethodDeclaration()]);
        if (!methodOrTriggerTreeNode)
            return;
        let varSection: ALFullSyntaxTreeNode | undefined = ALFullSyntaxTreeNodeExt.getFirstChildNodeOfKind(methodOrTriggerTreeNode, FullSyntaxTreeNodeKind.getVarSection(), false);
        if (!varSection)
            return;

        let allVariableDeclarations: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableDeclaration(), false, allVariableDeclarations);
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableDeclarationName(), true, allVariableDeclarations);
        if (allVariableDeclarations.length == variables.length) {
            edit.delete(document.uri, TextRangeExt.createVSCodeRange(varSection.fullSpan));
            return;
        }

        let variableRangesOfNormalDeclarations: { name: string, range: Range }[] = [];
        let variableDeclarations: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableDeclaration(), false, variableDeclarations);
        for (const variableDeclaration of variableDeclarations) {
            let varName: string = ALFullSyntaxTreeNodeExt.getIdentifierValue(document, variableDeclaration, false) as string;
            let range: Range = TextRangeExt.createVSCodeRange(variableDeclaration.fullSpan);
            variableRangesOfNormalDeclarations.push({ name: varName, range: range });
        }
        for (const variableRangeOfNormalDeclaration of variableRangesOfNormalDeclarations) {
            if (variables.some(variable => variable.name.toLowerCase() == variableRangeOfNormalDeclaration.name.toLowerCase()))
                edit.delete(document.uri, variableRangeOfNormalDeclaration.range);
        }

        let variableListDeclarations: ALFullSyntaxTreeNode[] = [];
        ALFullSyntaxTreeNodeExt.collectChildNodes(varSection, FullSyntaxTreeNodeKind.getVariableListDeclaration(), false, variableListDeclarations);
        for (const variableListDeclaration of variableListDeclarations) {
            let variableRangesOfDeclarationNames: { name: string, range: Range }[] = [];
            let variableDeclarationNames: ALFullSyntaxTreeNode[] = [];
            ALFullSyntaxTreeNodeExt.collectChildNodes(variableListDeclaration, FullSyntaxTreeNodeKind.getVariableDeclarationName(), false, variableDeclarationNames);
            let deleteWholeListDeclaration: boolean = true;
            for (let i = 0; i < variableDeclarationNames.length; i++) {
                let varName: string = ALFullSyntaxTreeNodeExt.getIdentifierValue(document, variableDeclarationNames[i], false) as string;
                if (!variables.some(variable => variable.name.toLowerCase() == varName.toLowerCase()))
                    deleteWholeListDeclaration = false;

                let rangeToRemove: Range = DocumentUtils.trimRange(document, TextRangeExt.createVSCodeRange(variableDeclarationNames[i].fullSpan));
                variableRangesOfDeclarationNames.push({ name: varName, range: rangeToRemove })
            }
            if (deleteWholeListDeclaration) {
                edit.delete(document.uri, TextRangeExt.createVSCodeRange(variableListDeclaration.fullSpan));
            } else {
                let previousOneDeleted: boolean = false;
                for (let i = variableRangesOfDeclarationNames.length - 1; i >= 0; i--) {
                    if (variables.some(variable => variable.name.toLowerCase() == variableRangesOfDeclarationNames[i].name.toLowerCase())) {
                        if (i != 0)
                            edit.delete(document.uri, new Range(variableRangesOfDeclarationNames[i - 1].range.end, variableRangesOfDeclarationNames[i].range.end));
                        else if (i == 0 && previousOneDeleted) {
                            edit.delete(document.uri, variableRangesOfDeclarationNames[i].range);
                        } else if (i == 0 && !previousOneDeleted) {
                            edit.delete(document.uri, new Range(variableRangesOfDeclarationNames[i].range.start, variableRangesOfDeclarationNames[i + 1].range.start));
                        }
                        previousOneDeleted = true;
                    } else
                        previousOneDeleted = false;
                }
            }
        }
    }
}