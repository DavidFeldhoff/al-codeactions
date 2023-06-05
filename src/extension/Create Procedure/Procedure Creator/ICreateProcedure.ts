import { AccessModifier } from '../../Entities/accessModifier';
import { ALObject } from '../../Entities/alObject';
import { ALVariable } from '../../Entities/alVariable';

export interface ICreateProcedure {
    initialize(): Promise<void>;
    getProcedureName(): string;
    getAccessModifier(): Promise<AccessModifier>;
    getObject(): Promise<ALObject>;
    getParameters(): Promise<ALVariable[]>;
    getReturnType(): Promise<string | undefined>;
    getVariables(): Promise<ALVariable[]>;
    getBody(): string | undefined;
    getMemberAttributes(): string[];
    getJumpToCreatedProcedure(): boolean;
    containsSnippet(): boolean;
    isReturnTypeRequired(): Promise<boolean>;
}