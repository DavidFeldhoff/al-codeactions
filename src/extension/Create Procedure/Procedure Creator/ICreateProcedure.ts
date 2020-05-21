import * as vscode from 'vscode';
import { ALProcedure } from '../../Entities/alProcedure';
import { ALVariable } from '../../Entities/alVariable';
import { ALObject } from '../../Entities/alObject';

export interface ICreateProcedure {
    initialize(): Promise<void>;
    getProcedureName(): string;
    isLocal(): boolean;
    getObject(): Promise<ALObject>;
    getParameters(): Promise<ALVariable[]>;
    getReturnType(): Promise<string | undefined>;
    getVariables(): Promise<ALVariable[]>;
    getBody(): string | undefined;
    getMemberAttributes(): string[];
}