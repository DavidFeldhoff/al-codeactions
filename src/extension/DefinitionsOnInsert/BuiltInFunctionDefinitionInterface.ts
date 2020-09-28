import { Location, Range, TextDocument } from "vscode";

export interface BuiltInFunctionDefinitionInterface {
    location: Location | undefined;
    builtInFunction: string;
    getBuiltInFunctionsSupported(): string[];
    setBuiltInFunction(builtInFunction: string): void;
    findLocation(document: TextDocument, wordRange: Range): Promise<boolean>;
    getTriggeredNodeLocations(): Promise<Location[]>;
}