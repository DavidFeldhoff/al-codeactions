import { commands, Position, TextDocument } from "vscode";
import { Command } from "../Entities/Command";

export class ContextSetter {
    public static onDidChangeTextEditorSelection(document: TextDocument, position: Position) {
        const selectedLine = document.lineAt(position.line).text
        const hoverOnTrigger: boolean = /^\s+trigger (OnInsert|OnModify|OnDelete|OnRename|OnValidate)/i.test(selectedLine)
        const hoverOnTableOrTableField: boolean = /^table|^\s+field\(|^\s+modify\(/i.test(selectedLine)
        const setFindRelated: boolean = hoverOnTrigger || hoverOnTableOrTableField
        commands.executeCommand('setContext', Command.findRelated, setFindRelated);
    }
}