import { CancellationToken, DefinitionProvider, Location, Position, Range, TextDocument } from 'vscode';
import { BuiltInFieldFunctionDefinition } from '../DefinitionsOnInsert/BuiltInFieldFunctionDefinition';
import { BuiltInFunctionDefinitionInterface } from '../DefinitionsOnInsert/BuiltInFunctionDefinitionInterface';
import { BuiltInFunctions } from '../DefinitionsOnInsert/BuiltInFunctions';
import { BuiltInTableDefinitionReference } from '../DefinitionsOnInsert/BuiltInTableFunctionDefinition';
export class DefinitionProviderCallToTrigger implements DefinitionProvider {

    async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Location[]> {
        let wordRange: Range | undefined = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return [];
        let word: string = document.getText(wordRange);

        let builtInFunctionReferenceProvider: BuiltInFunctionDefinitionInterface[] = [new BuiltInTableDefinitionReference(), new BuiltInFieldFunctionDefinition()]
        for (let i = 0; i < builtInFunctionReferenceProvider.length; i++) {
            let refProvider: BuiltInFunctionDefinitionInterface = builtInFunctionReferenceProvider[i];
            let builtInFunction: BuiltInFunctions = word.toLowerCase() as BuiltInFunctions;
            if (!refProvider.getBuiltInFunctionsSupported().includes(builtInFunction))
                continue;
            refProvider.setBuiltInFunction(builtInFunction);
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