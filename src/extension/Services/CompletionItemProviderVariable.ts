import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, Range, TextDocument, workspace } from 'vscode'
import { ALVariableParser } from '../Entity Parser/alVariableParser';
export class CompletionItemProviderVariable implements CompletionItemProvider {
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList> {
        let lineText: string = document.lineAt(position.line).text.substring(position.character)
        let parseResult = ALVariableParser.parseType(lineText);
        if(parseResult){
            let solvedByAlVarHelper = parseResult.wholeMatch.endsWith(';') && !/(Interface|TestRequestPage)/i.test(parseResult.type)
            if (!solvedByAlVarHelper) {
                let compItem: CompletionItem = new CompletionItem('vFull', CompletionItemKind.Text)
                let varName: string = ALVariableParser.createVariableNameByType(lineText)!;
                compItem.insertText = varName
                return [compItem];
            }
        }
        return [];
    }
}