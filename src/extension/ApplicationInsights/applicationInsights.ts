import { workspace } from "vscode"

export class ApplicationInsights {
    private static _instance: ApplicationInsights
    private appInsights: any
    private client: any
    private constructor() {
    }
    static getInstance(): ApplicationInsights {
        if (!ApplicationInsights._instance) {
            ApplicationInsights._instance = new ApplicationInsights()
        }
        return ApplicationInsights._instance
    }
    start() {
        this.appInsights = require('applicationinsights');
        this.appInsights.setup("InstrumentationKey=67325404-91c5-4291-bce7-2f80d591f253;IngestionEndpoint=https://germanywestcentral-1.in.applicationinsights.azure.com/").setAutoCollectPerformance(false, false).start();
        this.client = this.appInsights.defaultClient
        const configurations = workspace.getConfiguration('alCodeActions')
        let properties = JSON.parse(JSON.stringify(configurations));
        // this.trackEvent(EventName.Settings, configurations);
    }

    trackTrace(message: string) {
        this.client.trackTrace({ message: message });
    }
    trackCommand(command: string) {
        this.trackTrace(`Command ${command} was executed.`)
    }
    trackEvent(name: EventName, properties: any){
        this.client.trackEvent({name: name.toString(), properties: properties});
    }
}
export enum EventName{
    AddPublisher = "AddPublisher",
    CreateProcedure = "CreateProcedure",
    ExtractToProcedure = "ExtractToProcedure",
    CreateLabel = "CreateLabel",
    LocalVariableToGlobal = "LocalVariableToGlobal",
    ConvertOptionToEnum = "ConvertOptionToEnum",
    AddParameter = "AddParameter",
    CreateProcedureOverload = "CreateProcedureOverload",
    RefactorToValidate = "RefactorToValidate",
    Settings = "Settings"
}