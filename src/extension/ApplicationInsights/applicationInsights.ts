import * as applicationinsights from 'applicationinsights';

export class AppInsights {
    private static _instance: AppInsights
    private appInsights: typeof applicationinsights | undefined
    private client: any
    private constructor() {
    }
    static getInstance(): AppInsights {
        if (!AppInsights._instance) {
            AppInsights._instance = new AppInsights()
        }
        return AppInsights._instance
    }
    start() {
        this.appInsights = require('applicationinsights');
        this.appInsights!.setup("InstrumentationKey=f73de61d-dda6-446e-a964-ec0cf0d0d5e6;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com/")
            .setAutoCollectPerformance(false, false)
            .setAutoCollectExceptions(false)
            .start();
        this.client = this.appInsights!.defaultClient
    }

    trackTrace(message: string) {
        this.client.trackTrace({ message: message });
    }
    trackCommand(command: string) {
        this.trackTrace(`Command ${command} was executed.`)
    }
    trackEvent(name: EventName, properties: any) {
        this.client.trackEvent({ name: name.toString(), properties: properties });
    }
}
export enum EventName {
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