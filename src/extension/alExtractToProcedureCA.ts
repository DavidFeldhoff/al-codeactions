import * as vscode from 'vscode';
import { isUndefined } from 'util';
import { ALProcedure } from './alProcedure';
import { ALProcedureCallParser } from './alProcedureCallParser';
import { ALProcedureSourceCodeCreator } from './alProcedureSourceCodeCreator';
import { SupportedDiagnosticCodes } from './supportedDiagnosticCodes';
import { ALSourceCodeHandler } from './alSourceCodeHandler';
import { RenameMgt } from './checkRename';
import { ALCodeOutlineExtension } from './devToolsExtensionContext';
import { DocumentUtils } from './documentUtils';

export class ALExtractToProcedureCA implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];


    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        // if (RenameMgt.getInstance().getCallRename()) {
        //     let diagnostic = new ALSourceCodeHandler(document).getRelevantDiagnosticOfCurrentPosition(range);
        //     if (isUndefined(diagnostic)) {
        //         let text = document.getText(document.getWordRangeAtPosition(range.start));
        //         if (text === 'myProcedure') {
        //             RenameMgt.getInstance().setCallRename(false);
        //             vscode.commands.executeCommand('editor.action.rename');
        //         }
        //     }
        // }
        let procedureObject : ALProcedure | undefined = await this.provideProcedureObjectForCodeAction(document, range);
        if(!procedureObject){
            return;
        }

        let codeActionToCreateProcedure: vscode.CodeAction | undefined;
        codeActionToCreateProcedure = await this.createCodeAction(document, procedureObject, range.end);
        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            return [codeActionToCreateProcedure];
        }
    }
    public async provideProcedureObjectForCodeAction(document: vscode.TextDocument, range: vscode.Range): Promise<ALProcedure | undefined> {
        if (!this.considerRange(document, range)) {
            return;
        }

        let procedureOrTrigger: any = await this.getCurrentProcedureOrTriggerSymbol(document, range.start);
        let localVariables: any[] = this.getLocalVariables(procedureOrTrigger);
        let parameters: any[] = this.getParameters(procedureOrTrigger);

        let variablesNeeded: any[] = await this.getVariablesNeededInNewProcedure(localVariables, document, range);
        let parametersNeeded: any[] = await this.getParametersNeededInNewProcedure(parameters, document, range);


        let variablesWhichBecomeVarParameters: any[] = await this.getVariablesWhichBecomeVarParameters(variablesNeeded, procedureOrTrigger, document, range);
        let variablesWhichBecomeNormalParameters: any[] = this.getVariablesWhichBecomeNormalParameters(variablesNeeded, procedureOrTrigger, document, range);
        let variablesWhichStayLocalVariables: any[] = this.getVariablesWhichStayLocalVariables(variablesNeeded, variablesWhichBecomeVarParameters, variablesWhichBecomeNormalParameters);

        let parametersWhichBecomeVarParameters: any[] = this.getParametersWhichBecomeVarParameters(parametersNeeded, procedureOrTrigger, document, range);
        let parametersWhichBecomeNormalParameters: any[] = this.getParametersWhichBecomeNormalParameters(parametersNeeded, parametersWhichBecomeVarParameters);

        let procedureToCreate: ALProcedure | undefined;
        procedureToCreate = this.createProcedureObject(document,
            variablesWhichBecomeVarParameters,
            variablesWhichBecomeNormalParameters,
            variablesWhichStayLocalVariables,
            parametersWhichBecomeVarParameters,
            parametersWhichBecomeNormalParameters);

        return procedureToCreate;
    }
    getParametersWhichBecomeNormalParameters(parametersNeeded: any[], parametersWhichBecomeVarParameters: any[]): any[] {
        throw new Error("Method not implemented.");
    }
    getParametersWhichBecomeVarParameters(parametersNeeded: any[], procedureOrTrigger: any, document: vscode.TextDocument, rangeSelected: vscode.Range): any[] {
        throw new Error("Method not implemented.");
    }
    createProcedureObject(document: vscode.TextDocument, variablesWhichBecomeVarParameters: any[], variablesWhichBecomeNormalParameters: any[], variablesWhichStayLocalVariables: any[], parametersWhichBecomeVarParameters: any[], parametersWhichBecomeNormalParameters: any[]): ALProcedure | undefined {
        throw new Error("Method not implemented.");
    }
    getVariablesWhichStayLocalVariables(variablesNeeded: any[], variablesWhichBecomeVarParameters: any[], variablesWhichBecomeNormalParameters: any[]): any[] {
        throw new Error("Method not implemented.");
    }
    getVariablesWhichBecomeNormalParameters(variablesNeeded: any[], procedureOrTrigger: any, document: vscode.TextDocument, rangeSelected: vscode.Range): any[] {
        throw new Error("Method not implemented.");
    }
    async getVariablesWhichBecomeVarParameters(variablesNeeded: any[], procedureOrTrigger: any, document: vscode.TextDocument, rangeSelected: vscode.Range): Promise<any[]> {
        let bodyRangeOfProcedure: vscode.Range = this.getBodyRangeOfProcedure(document, procedureOrTrigger);
        let rangeBeforeSelection: vscode.Range = new vscode.Range(bodyRangeOfProcedure.start, rangeSelected.start);
        let rangeAfterSelection: vscode.Range = new vscode.Range(rangeSelected.end, bodyRangeOfProcedure.end);

        let variablesBecomingVarParameters: any[] = [];
        for (let i = 0; i < variablesNeeded.length; i++) {
            let variable = variablesNeeded[i];
            let isTemporary: boolean = false;
            let isProcedureCallOnObject: boolean = false;
            let isVarParameterOfOtherProcedurecall: boolean = false;

            isTemporary = this.isSymbolTemporary(variable);

            let position = new vscode.Position(variable.selectionRange.start.line, variable.selectionRange.start.character);
            let references: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, position);
            if (references && references.length > 0) {
                for (let reference of references) {
                    if (rangeBeforeSelection.contains(reference.range)) {
                        // TODO: If part of procedure call as var, then it has also to be a var-Parameter
                        isVarParameterOfOtherProcedurecall = this.isVarParameterOfOtherProcedureCall(rangeBeforeSelection, reference.range, document);
                        // If procedure call on this object, then the instance has to be handed over as var-Parameter as well.
                        isProcedureCallOnObject = this.isProcedureCallOnObject(rangeBeforeSelection, reference.range, document);
                    }
                    if (rangeAfterSelection.contains(reference.range)) {

                    }
                }
            }
            if (isTemporary || isProcedureCallOnObject) {
                variablesBecomingVarParameters.push(variable);
            }
        }
        return variablesBecomingVarParameters;
    }
    isVarParameterOfOtherProcedureCall(rangeBeforeSelection: vscode.Range, referenceRange: vscode.Range, document: vscode.TextDocument): boolean {
        let isInQuotes: boolean = DocumentUtils.isPositionInQuotes(document, rangeBeforeSelection, referenceRange.start);
        let isInProcedureCall: boolean = DocumentUtils.isPositionInProcedurecall(document, rangeBeforeSelection, referenceRange.start);
        return false;
    }
    private isSymbolTemporary(variable: any): boolean {
        let subtype: string = variable.subtype;
        return subtype.includes('temporary');
    }
    private isProcedureCallOnObject(rangeBeforeSelection: vscode.Range, referenceRange: vscode.Range, document: vscode.TextDocument) {
        let nextCharacterPosition: vscode.Position = referenceRange.end.translate(0, 1);
        let nextCharacter = document.getText(new vscode.Range(referenceRange.end, nextCharacterPosition));
        if (nextCharacter === '.') {
            let nextWordRange = DocumentUtils.getNextWordRangeInsideLine(document, rangeBeforeSelection, referenceRange.end);
            if (nextWordRange) {
                let nextWord: string = document.getText(nextWordRange);
                let characterAfterPossibleProcedureCall = document.getText(new vscode.Range(nextWordRange.end, nextWordRange.end.translate(0, 1)));
                if (characterAfterPossibleProcedureCall === '(') {
                    return true;
                }
            }
        }
        return false;
    }

    getBodyRangeOfProcedure(document: vscode.TextDocument, procedureOrTrigger: any): vscode.Range {
        let bodyRange: vscode.Range | undefined;
        let procedureRange: vscode.Range = new vscode.Range(procedureOrTrigger.range.start.line, procedureOrTrigger.range.start.character, procedureOrTrigger.range.end.line, procedureOrTrigger.range.end.character);
        // find beginning
        for (let i = procedureRange.start.line; i <= procedureRange.end.line; i++) {
            if (document.lineAt(i).text.match(/^\s+\bbegin\b/)) {
                bodyRange = new vscode.Range(i + 1, 0, procedureRange.end.line, procedureRange.end.character);
                break;
            }
        }
        if (!bodyRange) {
            throw new Error('Could not find beginning of procedure or trigger in document ' + document.fileName + ' of procedure ' + procedureOrTrigger.name);
        } else {
            return bodyRange;
        }
    }
    async getParametersNeededInNewProcedure(parameters: any[], document: vscode.TextDocument, rangeSelected: vscode.Range): Promise<any[]> {
        let parametersNeeded: any[] = [];
        for (let i = 0; i < parameters.length; i++) {
            let parameter = parameters[i];
            let position = new vscode.Position(parameter.selectionRange.start.line, parameter.selectionRange.start.character);
            let references: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, position);
            if (references && references.length > 0) {
                for (let reference of references) {
                    if (rangeSelected.contains(reference.range)) {
                        parametersNeeded.push(parameter);
                        break;
                    }
                }
            }
        }
        return parametersNeeded;
    }
    async getVariablesNeededInNewProcedure(localVariables: any[], document: vscode.TextDocument, rangeSelected: vscode.Range): Promise<any[]> {
        let variablesNeeded: any[] = [];
        for (let i = 0; i < localVariables.length; i++) {
            let localVariable = localVariables[i];
            let position = new vscode.Position(localVariable.selectionRange.start.line, localVariable.selectionRange.start.character);
            let references: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, position);
            if (references && references.length > 0) {
                for (let reference of references) {
                    if (rangeSelected.contains(reference.range)) {
                        variablesNeeded.push(localVariable);
                        break;
                    }
                }
            }
        }
        return variablesNeeded;
    }
    getParameters(procedureOrTrigger: any): any[] {
        let parameters: any[] = [];
        procedureOrTrigger.collectChildSymbols(240, true, parameters); //240 = parameters
        if (!parameters) {
            parameters = [];
        }
        return parameters;
    }
    getLocalVariables(procedureOrTrigger: any): any[] {
        let localVariables: any[] = [];
        procedureOrTrigger.collectChildSymbols(241, true, localVariables); //241 = local variables
        if (!localVariables) {
            localVariables = [];
        }
        return localVariables;
    }
    async getCurrentProcedureOrTriggerSymbol(document: vscode.TextDocument, position: vscode.Position): Promise<any> {
        return await ALCodeOutlineExtension.getProcedureOrTriggerSymbolOfCurrentLine(document.uri, position.line);
    }

    private considerRange(document: vscode.TextDocument, range: vscode.Range): boolean {
        return true;
    }

    private async createCodeAction(currentDocument: vscode.TextDocument, procedureToCreate: ALProcedure, currentPosition: vscode.Position): Promise<vscode.CodeAction | undefined> {
        let codeActionToCreateProcedure: vscode.CodeAction = await this.createFixToCreateProcedure(procedureToCreate, currentDocument, currentPosition);

        if (isUndefined(codeActionToCreateProcedure)) {
            return;
        } else {
            codeActionToCreateProcedure.isPreferred = true;
            return codeActionToCreateProcedure;
        }
    }

    private async createFixToCreateProcedure(procedure: ALProcedure, document: vscode.TextDocument, currentLineNo: vscode.Position): Promise<vscode.CodeAction> {
        const fix = new vscode.CodeAction(`Extract to procedure`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();

        let position: vscode.Position = await new ALSourceCodeHandler(document).getPositionToInsertProcedure(currentLineNo.line);
        let textToInsert = ALProcedureSourceCodeCreator.createProcedureDefinition(procedure);
        textToInsert = ALProcedureSourceCodeCreator.addLineBreaksToProcedureCall(document, position, textToInsert);
        fix.edit.insert(document.uri, position, textToInsert);
        return fix;
    }
}