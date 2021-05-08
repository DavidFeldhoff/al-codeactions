import { WorkspaceFolder } from "vscode";

declare module alstudio {

    export enum CollectorItemType {
        Object,
        EventPublisher,
        EventSubscriber
    }

    export const enum ALObjectType {
        table,
        tableextension,
        page,
        pagecustomization,
        pageextension,
        report,
        codeunit,
        xmlport,
        query,
        controladdin,
        enum,
        dotnet,
        profile,
        enumextension,
        interface
    }

    export interface ALParameter {
        Name: string;
        TypeDefinition: ALTypeDefinition;
        IsTemporary: boolean;
        IsVar: boolean;
    }

    export interface ALTypeDefinition {
        Name: string;
        Subtype?: ALTypeDefinitionSubType;
    }

    export interface ALTypeDefinitionSubType {
        Id?: number;
        Name: string;
        IsEmpty: boolean;
    }


    export interface ALProperty {
        Name: string;
        Type: string;
        Value: string;
    }

    export interface CollectorItemExternal {
        ItemTypeCaption: string;
        ItemType: CollectorItemType;
        TypeId: ALObjectType;
        Type: string;
        Id?: number;
        Name: string;
        TargetObjectType: string;
        TargetObject: string;
        Application: string;
        Publisher: string;
        Version: string;
        FsPath: string;
        EventName: string;
        EventSubscriberName: string;
        EventFieldName: string;
        EventType: string;
        EventParameters: Array<ALParameter>;
        Properties: Array<ALProperty>;
        IsLocal: boolean;
    }


    export interface IAlApi {
        services: Array<IAlApiService>;
    }
    export interface IAlApiService {
        context: any;
    }

    export enum ALApiServiceType {
        EditorService = 'EditorService',
        BuildService = 'BuildService'
    }

    export interface IAlEditorService extends IAlApiService {
        languageServerClient: IAlLanguageServerClient;
    }

    export interface IALBuildService extends IAlApiService {
        packageContainer(isRad: boolean): Promise<any>;
        publishContainer(publishOnly: boolean, isRad: boolean): Promise<any>;
        performBuild(isRad: boolean): Promise<any>;
        launchDebugger(workspacePath: WorkspaceFolder, publishOnly: boolean, isRad?: boolean, justDebug?: boolean, filter?: DebugConfigurationFilter): Promise<any>;
    }

    export interface IAlLanguageServerClient {
        lastActiveWorkspacePath: any;
        sendRequest(command: string, options: any): Promise<any>;
    }

    export interface AlLanguageConfigurationSettings {
        assemblyProbingPaths: Array<string>;
        codeAnalyzers: Array<string>;
        enableCodeAnalysis: boolean;
        backgroundCodeAnalysis: boolean;
        packageCachePath: string;
        ruleSetPath: string;
        enableCodeActions: boolean;
        incrementalBuild: boolean;
    }

    export interface IAlLanguageServerClientParameters {
        workspacePath: string;
        alResourceConfigurationSettings: AlLanguageConfigurationSettings;
        setActiveWorkspace: boolean;
        dependencyParentWorkspacePath?: string
    }

    export interface IAlLanguageServerClientBuildParameters {
        projectDir: string,
        args: Array<string>,
        isRad: boolean
    }

    export enum DebugConfigurationFilter {
        Launch = 2,
        Attach = 4,
        All = 6
    }

    export enum BuildType {
        BuildOnly,
        DebugOnly,
        PublishAndRun,
        PublishAndDebug,
        RapidPublishOnly,
        RapidPublishAndDebug
    }

    export interface IExternalAPIService {
        isWorkspaceScanned: boolean;
        onWorkspaceScanned: Function | undefined;
        getObjects(): Array<CollectorItemExternal>;
        getSymbolUri(type: ALObjectType, name: string, standardFormat?: boolean): any | null;
        getNextId(type: ALObjectType, projectNameOrFilePath: string): Promise<number>;
        getALLanguageApiService(): IALLanguageApiService;
    }

    export interface IALLanguageApiService {
        getAlRuntimeService(type: ALApiServiceType): Promise<IAlApiService | undefined>;
        getAlRuntimeSettings(workspacePath: string): IAlLanguageServerClientParameters;
        launchDebugger(workspacePath: string, buildType: BuildType): Promise<void>;
        getEditorService(): Promise<IAlEditorService>;
        getBuildService(): Promise<IALBuildService>;
        getALRuntimeAPI(): Promise<IAlApi>;
    }

}