import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, Range, TextDocument, workspace } from 'vscode'
export class CompletionItemProviderVariable implements CompletionItemProvider {
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList> {
        let regex: RegExp = /(v)?\s*:\s*(?<type>Record|Codeunit|Report|Query|Page|TestPage|Enum|Interface|TestRequestPage)\s+(?<subtype>"[^"]+"|\w+)(?<temp>\s+temporary)?\s*;?/i;
        let lineText: string = document.lineAt(position.line).text.substring(position.character)
        let matchArray: RegExpMatchArray | null = lineText.match(regex)
        if (matchArray && matchArray.groups) {
            let wholeMatch = matchArray[0]
            let type = matchArray.groups['type']
            let subtype = matchArray.groups['subtype'];
            let temp = matchArray.groups['temp']

            let solvedByAlVarHelper = wholeMatch.endsWith(';') && !/(Interface|TestRequestPage)/i.test(type)
            if (!solvedByAlVarHelper) {
                let compItem: CompletionItem = new CompletionItem('vFull', CompletionItemKind.Text)
                let varName = this.createVariableName(subtype, temp);
                compItem.insertText = varName
                return [compItem];
            }
        }
        return [];
    }

    private createVariableName(subtype: string, temp: string) {
        let varName = subtype.replace(/[^\wäöüß]/gi, '');
        varName = this.removeAffixes(varName);
        if (temp)
            varName = 'Temp' + varName;
        return varName;
    }

    private removeAffixes(varName: string) {
        let ignoreALPrefix: string = workspace.getConfiguration('alVarHelper').get<string>('ignoreALPrefix', '');
        let ignoreALPrefixes: string[] = ignoreALPrefix.split(';');
        let ignoreALSuffix: string = workspace.getConfiguration('alVarHelper').get<string>('ignoreALSuffix', '');
        let ignoreALSuffixes: string[] = ignoreALSuffix.split(';');
        for (const prefix of ignoreALPrefixes)
            if (varName.startsWith(prefix))
                varName = varName.substr(prefix.length);
        for (const suffix of ignoreALSuffixes)
            if (varName.endsWith(suffix))
                varName = varName.substr(0, varName.length - suffix.length);
        return varName;
    }
}