import { Extension, extensions } from "vscode";

export class ALObjectDesigner {
    static isInstalled(): boolean {
        return extensions.getExtension('martonsagi.al-object-designer') !== undefined;
    }
    static async getApi(): Promise<ALObjectDesignerAPI> {
        return await extensions.getExtension('martonsagi.al-object-designer')?.activate();
    }
}

export interface ALObjectDesignerAPI {
    ALPanel: ALPanel,
    ALObjectCollector: any,
    ALProjectCollector: any
};
export interface ALPanel {
    objectList?: Array<CollectorItem>;
    eventList?: Array<CollectorItem>;
    currEvents?: Array<CollectorItem>;
}

export interface SymbolReference {
    AppId: string;
    Name: string;
    Publisher: string;
    Version: string;
    Tables: Array<Table>;
    Codeunits: Array<Codeunit>;
    Pages: Array<Page>;
    PageExtensions: Array<PageExtension>;
    PageCustomizations: Array<PageCustomization>;
    TableExtensions: Array<TableExtension>;
    Reports: Array<Report>;
    XmlPorts: Array<XmlPort>;
    Queries: Array<Query>;
    Profiles: Array<Profile>;
    ControlAddIns: Array<any>;
    EnumTypes: Array<EnumType>;
    DotNetPackages: Array<any>;
}

export interface ALObject {
    Id: number;
    Type: string;
    Name: string;
    Properties?: Array<Property>;
    Variables?: Array<Variable>;
    Methods?: Array<Method>;
    FsPath?: string;
    SourceTable?: Table;
}

export interface Table extends ALObject {
    Fields: Array<TableField>;
    Keys: Array<TableKey>;
    FieldGroups: Array<TableKey>;
}

export interface TableExtension extends Table {
    TargetObject: string;
}

export interface Page extends ALObject {
    Controls: Array<PageControl>;
    Actions: Array<PageAction>;
}

export interface PageExtension extends ALObject {
    TargetObject: string;
    ControlChanges: Array<any>;
}

export interface PageCustomization extends PageExtension {
}

export interface Codeunit extends ALObject {
}

export interface Report extends ALObject {
    RequestPage?: Page;
    DataItems: Array<any>;
}

export interface XmlPort extends ALObject {
    RequestPage?: Page;
    Schema: Array<any>;
}

export interface Query extends ALObject {
    Elements: Array<any>;
}

export interface EnumType extends ALObject {
    Values: Array<EnumValue>;
}

export interface Profile extends ALObject {
    Description: string;
    RoleCenter: string;
    Customizations: Array<string>;
}

// AL Properties
export interface Property {
    Name: string;
    Value: string;
}

export interface TypeDefinition {
    Name: string;
    Subtype?: TypeDefinitionSubType
}

export interface TypeDefinitionSubType {
    Id: number;
    Name: string;
    IsEmpty: boolean;
}

export interface TableField {
    Id: number;
    Name: string;
    Properties: Array<Property>;
}

export interface TableKey {
    Name: string;
    FieldNames: Array<string>;
    Properties?: Array<Property>;
}

export interface Variable {
    Name: string;
    TypeDefinition: TypeDefinition;
}

export interface Parameter extends Variable {
    IsVar: boolean;
}

export interface Attribute {
    Name: string;
    Arguments?: Array<Argument>;
}

export interface Argument {
    Value?: string;
}

export interface ReturnTypeDefinition {
    Name: string;
}

export interface Method {
    Id: number;
    Name: string;
    ReturnTypeDefinition: ReturnTypeDefinition;
    MethodKind: number;
    Variables: Array<Variable>;
    Parameters: Array<Parameter>;
    Attributes?: Array<any>;
    IsLocal?: boolean;
}

export interface EnumValue {
    Name: string;
    Ordinal: number;
    Properties?: Array<Property>;
}

export interface PageControlBase {
    Id: number;
    Name: string;
    Kind: number;
    TypeDefinition: TypeDefinition;
    Properties?: Array<Property>;
    ControlType?: string;
    SourceExpression?: string;
    Caption?: string;
    SourceCodeAnchor?: string;
    Parent?: PageControlBase;
    GroupName?: string;
    FsPath?: string;
}

export interface PageControl extends PageControlBase {
    Controls?: Array<PageControl>;
    Parent?: PageControl;
    Kind: ControlKind;
    Symbol?: Page;
}

export interface PageAction extends PageControlBase {
    Actions?: Array<PageAction>;
    Parent?: PageAction;
    Kind: ActionKind;
}

export enum ControlKind {
    Area,
    Group,
    CueGroup,
    Repeater,
    Fixed,
    Grid,
    Part,
    SystemPart,
    Field,
    Label,
    UserControl,
    ChartPart
}

export enum ActionKind {
    Area,
    Group,
    Action,
    Separator
}

export enum ExtendedDatatypeKind {
    None,
    PhoneNo,
    URL,
    EMail,
    Ratio,
    Masked,
    Person
}

export enum FieldClassKind {
    Normal,
    FlowField,
    FlowFilter
}

export enum FieldSubtypeKind {
    Json,
    UserDefined,
    Bitmap,
    Memo
}

export enum DefaultLayoutKind {
    RDLC,
    Word
}

export enum MethodKind {
    Method,
    Trigger,
    BuiltInMethod,
    BuiltInOperator,
    Property,
    DeclareMethod,
    EventTrigger
}


export enum PanelMode {
    List = "List",
    Design = "Design",
    EventList = "EventList"
}

export enum ParseMode {
    File = 'File',
    Text = 'Text',
    Symbol = 'Symbol'
}

export interface CollectorItem {
    TypeId: number;
    Type: string;
    Id: number;
    Name: string;
    TargetObject?: string;
    TargetObjectType?: string;
    TargetEventName?: string;
    Publisher: string;
    Application: string;
    Version: string;
    CanExecute: boolean;
    CanDesign: boolean;
    CanCreatePage: boolean;
    FsPath: string;
    EventName: string;
    EventPublisher: boolean;
    EventType?: string;
    Events?: Array<any>;
    EventParameters?: Array<Parameter>;
    SymbolData?: SymbolData;
    Symbol: any;
    SubType: string;
    Scope?: string;
}

export interface TemplateItem {
    id: string;
    title: string;
    description: string;
    body: Array<string>;
    position: number;
    path: string;
}

export interface ObjectCollectorCache {
    isCached(path: string): Promise<boolean>;
    setCache(path: string, data: any): Promise<void>;
    getCache(path: string): Promise<ObjectCollectorCacheInfo>;
}

export interface ObjectCollectorCacheInfo {
    Path: string;
    Timestamp: number;
    Items: Array<CollectorItem>;
}

export interface Collector<T> {
    discover(): Promise<Array<T>>;
}

export interface ObjectCollector extends Collector<CollectorItem> {
    discover(): Promise<Array<CollectorItem>>;
}

export interface SymbolData {
    Path: string;
    Type: string;
    Index: number;
    SymbolZipPath?: string;
}

export interface TemplateCollector extends Collector<TemplateItem> {
    initialize(): void;
    discover(): Promise<Array<TemplateItem>>;
}

export interface CommandHandler {
    dispatch(message: any): Promise<void>;
}

export interface ObjectParser {
    parse(options: any, mode: ParseMode): Promise<ALObject>;
}

export interface ParsedObjectRegion {
    Region: string;
    Name?: string;
    Children?: Array<ParsedObjectRegion>;
    Id?: number;
    Type?: string;
    Properties?: Array<Property | null>;
    Source?: string;
    SourceCode?: string;
}