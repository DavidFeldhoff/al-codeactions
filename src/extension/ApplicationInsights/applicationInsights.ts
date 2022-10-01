const appInsights = require("applicationinsights")

export function start() {
    appInsights.setup("InstrumentationKey=f73de61d-dda6-446e-a964-ec0cf0d0d5e6;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com/")
        .setAutoCollectPerformance(false, false)
        .setAutoCollectExceptions(false)
        .start();
}

export function trackTrace(message: string) {
    const client = appInsights.defaultClient
    if (client)
        client.trackTrace({ message: message });
}
export function trackCommand(command: string) {
    trackTrace(`Command ${command} was executed.`)
}
export function trackEvent(name: EventName, properties: any) {
    const client = appInsights.defaultClient
    if (client)
        client.trackEvent({ name: name.toString(), properties: properties });
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