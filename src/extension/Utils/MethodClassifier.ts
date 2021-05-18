import { IALMethod } from "../Entities/IALMethod";
import { MethodType } from "../Entities/methodTypes";

export class MethodClassifier {
    public static classifyMethodAsType(method: IALMethod): MethodType {
        let keyValuePairs: Map<string, MethodType> = new Map();
        keyValuePairs.set('Test', MethodType.TestMethod);
        keyValuePairs.set('ConfirmHandler', MethodType.ConfirmHandler);
        keyValuePairs.set('FilterPageHandler', MethodType.FilterPageHandler);
        keyValuePairs.set('HyperlinkHandler', MethodType.HyperlinkHandler);
        keyValuePairs.set('MessageHandler', MethodType.MessageHandler);
        keyValuePairs.set('ModalPageHandler', MethodType.ModalPageHandler);
        keyValuePairs.set('PageHandler', MethodType.PageHandler);
        keyValuePairs.set('ReportHandler', MethodType.ReportHandler);
        keyValuePairs.set('RequestPageHandler', MethodType.RequestPageHandler);
        keyValuePairs.set('SendNotificationHandler', MethodType.SendNotificationHandler);
        keyValuePairs.set('RecallNotificationHandler', MethodType.RecallNotificationHandler);
        keyValuePairs.set('SessionSettingsHandler', MethodType.SessionSettingsHandler);
        keyValuePairs.set('StrMenuHandler', MethodType.StrMenuHandler);
        keyValuePairs.set('EventSubscriber', MethodType.EventSubscriber);
        keyValuePairs.set('BusinessEvent', MethodType.BusinessEventPublisher);
        keyValuePairs.set('IntegrationEvent', MethodType.IntegrationEventPublisher);
        for (const keyValuePair of keyValuePairs.entries())
            if (method.getMemberAttributes().find(memberAttribute => memberAttribute.toLowerCase().trim().startsWith(keyValuePair[0].toLowerCase().trim())))
                return keyValuePair[1]
        return MethodType.Method
    }
}