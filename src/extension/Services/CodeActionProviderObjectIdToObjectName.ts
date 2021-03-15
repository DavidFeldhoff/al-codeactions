import { CodeAction, CodeActionKind, Range, TextDocument, WorkspaceEdit } from "vscode";
import { FullSyntaxTreeNodeKind } from "../AL Code Outline Ext/fullSyntaxTreeNodeKind";
import { ALFullSyntaxTreeNode } from "../AL Code Outline/alFullSyntaxTreeNode";
import { SyntaxTree } from "../AL Code Outline/syntaxTree";
import { ToolsProjectSymbolsRequest } from "../AL Code Outline/toolsProjectSymbolsRequest";
import { ALCodeOutlineExtension } from "../devToolsExtensionContext";
import { ICodeActionProvider } from "./ICodeActionProvider";
import * as vscode from 'vscode';
import { ToolsProjectSymbolsResponse } from "../AL Code Outline/toolsProjectSymbolsResponse";
import { AZSymbolInformation } from "../AL Code Outline/AZSymbolInformation";
import { AZSymbolKind } from "../AL Code Outline/azSymbolKind";
import { TextRange } from "../AL Code Outline/textRange";

export class CodeActionProviderObjectIdToObjectName implements ICodeActionProvider {
    document: TextDocument;
    range: Range;
    constructor(document: TextDocument, range: Range) {
        this.document = document;
        this.range = range;
    }

    async considerLine(): Promise<boolean> {
        let currentIndent: number = this.document.lineAt(this.range.start.line).firstNonWhitespaceCharacterIndex
        let indentOfVar: number = currentIndent - 4
        for (let lineNo = this.range.start.line; lineNo > 0; lineNo--) {
            if (this.document.lineAt(lineNo).firstNonWhitespaceCharacterIndex == indentOfVar) {
                if (this.document.lineAt(lineNo).text.trim().toLowerCase() == 'var')
                    return true
                else
                    break;
            }
        }
        return false;
    }
    async createCodeActions(): Promise<CodeAction[]> {
        let syntaxTree: SyntaxTree = await SyntaxTree.getInstance(this.document);

        let edit: WorkspaceEdit = new WorkspaceEdit();
        let varSection: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getVarSection()]);
        if (varSection) {
            await this.replaceObjectIdWithObjectName(syntaxTree, edit);
            if (edit.entries().length > 0) {
                let codeAction: CodeAction = new CodeAction('Replace with object name', CodeActionKind.Refactor);
                codeAction.edit = edit;
                return [codeAction];
            }
        }
        return [];
    }

    private async replaceObjectIdWithObjectName(syntaxTree: SyntaxTree, edit: WorkspaceEdit): Promise<void> {
        let variableDeclarationNode: ALFullSyntaxTreeNode | undefined = syntaxTree.findTreeNode(this.range.start, [FullSyntaxTreeNodeKind.getVariableDeclaration(), FullSyntaxTreeNodeKind.getVariableListDeclaration()]);
        if (!variableDeclarationNode)
            return;

        var pos = variableDeclarationNode.childNodes?.findIndex((node) => 
            node.kind == FullSyntaxTreeNodeKind.getRecordTypeReferenceName() ||
            node.kind == FullSyntaxTreeNodeKind.getSimpleTypeReferenceName());
        if (pos == -1)
            return;

        var { objectType, objectId } = this.getTypeInformationOfVariableDeclaration(variableDeclarationNode.childNodes![pos!], this.document);

        var fullObjectName = await this.getObjectNameFromId(objectType, objectId);
        if (!fullObjectName)
            return;
        vscode.window.showInformationMessage(`Found object: ${fullObjectName}`)
        var objectIdNode = this.findNodeRecursive(variableDeclarationNode.childNodes![pos!], (node) => node.kind == FullSyntaxTreeNodeKind.getSubtypedDataTypeName());
        if (objectIdNode) {
            var test: TextRange = objectIdNode!.fullSpan!;
            var test2 = new vscode.Range(test!.start!.line, test!.start!.character, test!.end!.line, test!.end!.character);
            edit.replace(this.document.uri, test2, fullObjectName);
        }
    }

    private findNodeRecursive(nodes: ALFullSyntaxTreeNode, predicate: (value: ALFullSyntaxTreeNode) => boolean) : ALFullSyntaxTreeNode | undefined
    {
        if (nodes.childNodes)
        {
            for (let index = 0; index < nodes.childNodes.length; index++) {
                const element = nodes.childNodes[index];
                if (predicate(element))
                    return element;
                
                var recursive = this.findNodeRecursive(element, predicate);
                if (recursive)
                    return recursive;
            }
        }
        return undefined;
    }

    private async getObjectNameFromId(objectType: string, objectId: number): Promise<string> {
        let azalDevTools = (await ALCodeOutlineExtension.getInstance()).getAPI();
        let workspacePath = azalDevTools.alLangProxy.getCurrentWorkspaceFolderPath();

        let alPackagesPath = vscode.workspace.getConfiguration('al', null).get<string>('packageCachePath');
        if (!alPackagesPath)
            alPackagesPath = ".alpackages";

        let workspaceFoldersPaths: string[] = [];
        let folders = vscode.workspace.workspaceFolders;
        if (folders) {
            for (let i = 0; i < folders.length; i++) {
                if (folders[i].uri)
                    workspaceFoldersPaths.push(folders[i].uri.fsPath);
            }
        }

        let request: ToolsProjectSymbolsRequest = new ToolsProjectSymbolsRequest(true, workspacePath, alPackagesPath, workspaceFoldersPaths);
        let response: ToolsProjectSymbolsResponse = await azalDevTools.toolsLangServerClient.getProjectSymbols(request);
        let outList: AZSymbolInformation[] = [];
        let rootSymbol = AZSymbolInformation.fromAny(response.root);
        rootSymbol.collectObjectSymbols(outList);
        var objectName = this.GetObjectNameForObjectId(this.objectTypeAsStringToAZSymbolKind(objectType), objectId, outList);
        
        if (objectName == "")
        {
            vscode.window.showErrorMessage("Could not find the object name.");
            return "";
        }

        return objectName;
    }

    private GetObjectNameForObjectId(objectType: AZSymbolKind, objectId: number | undefined, list: any[]): string {
        if (list) {
            for (let i = 0; i < list.length; i++) {
                var element = list[i];
                if ((element.id == objectId) && (element.kind == objectType)) {
                    return element.fullName;
                }
                if (element.childSymbols) {
                    let result = this.GetObjectNameForObjectId(objectType, objectId, element.childSymbols);
                    if (result != "")
                        return result;
                }
            }
        }
        return "";
    }

    private objectTypeAsStringToAZSymbolKind(objectType: string): AZSymbolKind {
        switch (objectType) {
            case "Table":
                return AZSymbolKind.TableObject;
            case "Page":
                return AZSymbolKind.PageObject;
            case "Report":
                return AZSymbolKind.ReportObject;
            case "XmlPort":
                return AZSymbolKind.XmlPortObject;
            case "Query":
                return AZSymbolKind.QueryObject;
            case "Codeunit":
                return AZSymbolKind.CodeunitObject;
            case "ControlAddIn":
                return AZSymbolKind.ControlAddInObject;
            case "PageExtension":
                return AZSymbolKind.PageExtensionObject;
            case "TableExtension":
                return AZSymbolKind.TableExtensionObject;
            case "Profile":
                return AZSymbolKind.ProfileObject;
            case "PageCustomization":
                return AZSymbolKind.PageCustomizationObject;
            case "Enum":
                return AZSymbolKind.EnumType;
            case "DotNetPackage":
                return AZSymbolKind.DotNetPackage;
            case "Interface":
                return AZSymbolKind.Interface;
            default:
                return AZSymbolKind.Undefined;
        }
    }

    private getTypeInformationOfVariableDeclaration(subtypedDataTypeNode: ALFullSyntaxTreeNode, document: TextDocument): { objectType: string, objectId: number } {
        let objectType: string;
        let objectId: number;

        switch (subtypedDataTypeNode.kind) {
            case "SimpleTypeReference":
                objectType = subtypedDataTypeNode.dataType!.split(' ')[0];
                break;
            case "RecordTypeReference":
                objectType = "Table";
                break;
            default:
                objectType = "";
                break;
        }
        objectId = parseInt(subtypedDataTypeNode.dataType!.split(' ')[1]);
        return { objectType, objectId }
    }

}