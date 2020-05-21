import * as vscode from 'vscode';
import { ICreateProcedure } from '../Procedure Creator/ICreateProcedure';

export interface ICodeActionCreator {
    considerLine(): Promise<boolean>;
    createCodeActions(): Promise<vscode.CodeAction[] | undefined>;
}