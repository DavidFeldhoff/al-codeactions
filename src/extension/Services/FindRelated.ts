import { commands, Position, Range, TextDocument, window } from "vscode";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { FindRelatedCalls, showInsertConfig } from "./FindRelatedCalls";
import { FindRelatedEventSubscribers } from "./FindRelatedEventSubscribers";
import { FindRelatedTriggersOfTableExt } from "./FindRelatedTriggersOfTableExt";

export class FindRelated {
    public static async exec(choice: number) {
        if (!window.activeTextEditor) return
        let document = window.activeTextEditor.document
        let position = window.activeTextEditor.selection.start
        let builtInFunction = this.getFunction(document, position)
        if (!builtInFunction) return

        commands.executeCommand('references-view.clearHistory');
        switch (choice) {
            case 1:
                if (builtInFunction == BuiltInFunctions.Validate)
                    FindRelatedCalls.activateListener(builtInFunction)
                else {
                    let options: string[] = this.getOptions(builtInFunction)
                    let option: string | undefined
                    if (options.length > 1)
                        option = await window.showQuickPick(options);
                    else
                        option = options[0]
                    if (!option) return
                    if (option.includes('(true)'))
                        FindRelatedCalls.activateListener(builtInFunction, showInsertConfig["Insert(true)-Calls only"])
                    else
                        FindRelatedCalls.activateListener(builtInFunction, showInsertConfig['All Insert-Calls'])
                }
                break;
            case 2:
                FindRelatedEventSubscribers.activateListener(builtInFunction)
                break;
            case 3:
                FindRelatedTriggersOfTableExt.activateListener(builtInFunction)
                break;
            default:
                return
        }
        commands.executeCommand('references-view.findReferences', document.uri, position)
    }
    private static getOptions(builtInFunction: BuiltInFunctions): string[] {
        let func = builtInFunction.toString()
        func = func.charAt(0).toUpperCase() + func.substring(1).toLowerCase()
        switch (builtInFunction) {
            case BuiltInFunctions.Insert:
            case BuiltInFunctions.Modify:
            case BuiltInFunctions.Delete:
                return [
                    func + '(true) calls only',
                    'All ' + func + ' calls'
                ]
            case BuiltInFunctions.Validate:
                return [
                    'Validate'
                ]
        }
        return []
    }
    private static getFunction(document: TextDocument, position: Position): BuiltInFunctions | undefined {
        let wordRange: Range | undefined = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return;
        let word: string = document.getText(wordRange);

        switch (word.trim().toLowerCase()) {
            case 'oninsert':
                return BuiltInFunctions.Insert;
            case 'onmodify':
                return BuiltInFunctions.Modify;
            case 'ondelete':
                return BuiltInFunctions.Delete;
            case 'onvalidate':
                return BuiltInFunctions.Validate;
            default:
                return;
        }
    }
}