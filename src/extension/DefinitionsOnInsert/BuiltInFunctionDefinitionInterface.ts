import { Location, Range, TextDocument } from "vscode";
import { BuiltInFunctions } from "./BuiltInFunctions";

export interface BuiltInFunctionDefinitionInterface {
    location: Location | undefined;
    builtInFunction: BuiltInFunctions | undefined;
    getBuiltInFunctionsSupported(): BuiltInFunctions[];
    setBuiltInFunction(builtInFunction: BuiltInFunctions): void;
    findLocation(document: TextDocument, wordRange: Range): Promise<boolean>;
    getTriggeredNodeLocations(): Promise<Location[]>;
}