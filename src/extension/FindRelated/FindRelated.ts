import { commands, Position, Range, ReferenceProvider, TextDocument, window, workspace } from "vscode";
import { BuiltInFunctions } from "../DefinitionsOnInsert/BuiltInFunctions";
import { FindRelatedDataProvider } from "./dataprovider";
import { FindRelatedCalls, showInsertConfig } from "./FindRelatedCalls";
import { FindRelatedEventSubscribers } from "./FindRelatedEventSubscribers";
import { FindRelatedTriggersOfTableExt } from "./FindRelatedTriggersOfTableExt";

export class FindRelated {
    public static async exec(choice: FindRelatedEnum) {
        if (!window.activeTextEditor) return
        const document = window.activeTextEditor.document
        const range: Range = window.activeTextEditor.selection
        let position = range.start
        let builtInFunction = this.getFunction(document, position)
        if (!builtInFunction) {
            const selectedLine: string = document.lineAt(position.line).text;
            const isObject: boolean = /^table/i.test(selectedLine)
            const isField: boolean = /^\s+field\(|^\s+modify\(/i.test(selectedLine)
            if (isObject) {
                const items: { label: string, builtInFunction: BuiltInFunctions }[] = [
                    { label: 'Insert', builtInFunction: BuiltInFunctions.Insert },
                    { label: 'Modify', builtInFunction: BuiltInFunctions.Modify },
                    { label: 'Delete', builtInFunction: BuiltInFunctions.Delete },
                    { label: 'Rename', builtInFunction: BuiltInFunctions.Rename }
                ]
                const thing = choice == FindRelatedEnum.EventSubscriber ? 'event subscribers' : choice == FindRelatedEnum.Triggers ? 'triggers' : 'calls'
                const pickedItem = await window.showQuickPick(items, { title: `Which related ${thing} do you want to see?` })
                if (!pickedItem) return
                builtInFunction = pickedItem.builtInFunction
            } else if (isField)
                builtInFunction = BuiltInFunctions.Validate
            else
                return
        }

        let referenceProvider: ReferenceProvider;
        switch (choice) {
            case FindRelatedEnum.Calls:
                if (builtInFunction == BuiltInFunctions.Validate)
                    referenceProvider = new FindRelatedCalls(builtInFunction);
                else {
                    let items: string[] = this.getItems(builtInFunction)
                    let pickedItem: string | undefined
                    if (items.length > 1)
                        pickedItem = await window.showQuickPick(items);
                    else
                        pickedItem = items[0]
                    if (!pickedItem) return
                    let show: showInsertConfig;
                    if (pickedItem.includes('(true)'))
                        show = showInsertConfig["Insert(true)-Calls only"]
                    else
                        show = showInsertConfig['All Insert-Calls']
                    referenceProvider = new FindRelatedCalls(builtInFunction, show);
                }
                break;
            case FindRelatedEnum.EventSubscriber:
                referenceProvider = new FindRelatedEventSubscribers(builtInFunction);
                break;
            case FindRelatedEnum.Triggers:
                referenceProvider = new FindRelatedTriggersOfTableExt(builtInFunction);
                break;
            default:
                return
        }
        const dataProvider = new FindRelatedDataProvider(document, range, referenceProvider);
        window.createTreeView('al-codeActions-references', { treeDataProvider: dataProvider })
        commands.executeCommand('setContext', "show-al-codeactions-references", true);
        commands.executeCommand("al-codeActions-references.focus")
    }
    private static getItems(builtInFunction: BuiltInFunctions): string[] {
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
        const selectedLine = document.lineAt(position.line).text
        const regex = /^\s+trigger (OnInsert|OnModify|OnDelete|OnRename|OnValidate)/i
        if (!regex.test(selectedLine))
            return

        if (/OnInsert/i.test(selectedLine))
            return BuiltInFunctions.Insert;
        else if (/OnModify/i.test(selectedLine))
            return BuiltInFunctions.Modify;
        else if (/OnDelete/i.test(selectedLine))
            return BuiltInFunctions.Delete;
        else if (/OnValidate/i.test(selectedLine))
            return BuiltInFunctions.Validate;
        else
            return;
    }

}
export enum FindRelatedEnum {
    Calls = 'Calls',
    EventSubscriber = 'EventSubscriber',
    Triggers = 'Triggers'
}