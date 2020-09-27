import { CancellationToken, DefinitionProvider, Location, Position, Range, TextDocument } from 'vscode';
import { BuiltInFieldFunctionDefinition } from '../DefinitionsOnInsert/BuiltInFieldFunctionDefinition';
import { BuiltInFunctionDefinitionInterface } from '../DefinitionsOnInsert/BuiltInFunctionDefinitionInterface';
import { BuiltInTableDefinitionReference } from '../DefinitionsOnInsert/BuiltInTableFunctionDefinition';
export class ALCreateDefinitionProviderOnInsert implements DefinitionProvider {

    async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Location[]> {
        let wordRange: Range | undefined = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return [];
        let word: string = document.getText(wordRange);

        let builtInFunctionReferenceProvider: BuiltInFunctionDefinitionInterface[] = [new BuiltInTableDefinitionReference(), new BuiltInFieldFunctionDefinition()]
        for (let i = 0; i < builtInFunctionReferenceProvider.length; i++) {
            let refProvider: BuiltInFunctionDefinitionInterface = builtInFunctionReferenceProvider[i];
            if (!refProvider.getBuiltInFunctionsSupported().includes(word.toLowerCase()))
                continue;
            refProvider.setBuiltInFunction(word);
            if (await refProvider.findLocation(document, wordRange)) {
                let locationOfTrigger: Location[] = await this.getLocationsOfTriggeredFunctions(refProvider);
                if (locationOfTrigger.length > 0)
                    return locationOfTrigger;
            }
        }
        return [];
    }
    async getLocationsOfTriggeredFunctions(refProvider: BuiltInFunctionDefinitionInterface): Promise<Location[]> {
        let triggeredNodeLocations: Location[] = await refProvider.getTriggeredNodeLocations();
        return triggeredNodeLocations;
    }
}