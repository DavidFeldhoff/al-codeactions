import { AZSymbolInformation } from "../AL Code Outline/AZSymbolInformation";
import { AZSymbolKind } from '../AL Code Outline/azSymbolKind';
import { AccessModifier } from "../Entities/accessModifier";
import { ALProcedure } from '../Entities/alProcedure';
import { Err } from "../Utils/Err";

export class AZSymbolInformationExt {
    public static collectChildNodes(azSymbolInformation: AZSymbolInformation, kindsOfSymbolInformation: AZSymbolKind[], searchAllLevels: boolean, outList: AZSymbolInformation[]) {
        if (azSymbolInformation.childSymbols) {
            for (let i = 0; i < azSymbolInformation.childSymbols.length; i++) {
                if (kindsOfSymbolInformation.includes(azSymbolInformation.childSymbols[i].kind)) {
                    outList.push(azSymbolInformation.childSymbols[i]);
                }
                if (searchAllLevels) {
                    this.collectChildNodes(azSymbolInformation.childSymbols[i], kindsOfSymbolInformation, searchAllLevels, outList);
                }
            }
        }
    }
    static getSymbolKindOfALProcedure(procedureToInsert: ALProcedure): AZSymbolKind {
        if (procedureToInsert.getMemberAttributes().length === 0) {
            if (procedureToInsert.accessModifier == AccessModifier.local) {
                return AZSymbolKind.LocalMethodDeclaration;
            } else {
                return AZSymbolKind.MethodDeclaration;
            }
        } else {
            let memberAttributes: string = procedureToInsert.getMemberAttributes().join('\r\n').toLowerCase();
            switch (true) {
                case memberAttributes.includes('test'): return AZSymbolKind.TestDeclaration;
                case memberAttributes.includes('confirmhandler'): return AZSymbolKind.ConfirmHandlerDeclaration;
                case memberAttributes.includes('filterpagehandler'): return AZSymbolKind.FilterPageHandlerDeclaration;
                case memberAttributes.includes('hyperlinkhandler'): return AZSymbolKind.HyperlinkHandlerDeclaration;
                case memberAttributes.includes('messagehandler'): return AZSymbolKind.MessageHandlerDeclaration;
                case memberAttributes.includes('modalpagehandler'): return AZSymbolKind.ModalPageHandlerDeclaration;
                case memberAttributes.includes('pagehandler'): return AZSymbolKind.PageHandlerDeclaration;
                case memberAttributes.includes('reporthandler'): return AZSymbolKind.ReportHandlerDeclaration;
                case memberAttributes.includes('requestpagehandler'): return AZSymbolKind.RequestPageHandlerDeclaration;
                case memberAttributes.includes('sendnotificationhandler'): return AZSymbolKind.SendNotificationHandlerDeclaration;
                case memberAttributes.includes('sessionsettingshandler'): return AZSymbolKind.SessionSettingsHandlerDeclaration;
                case memberAttributes.includes('strmenuhandler'): return AZSymbolKind.StrMenuHandlerDeclaration;
                case memberAttributes.includes('eventsubscriber'): return AZSymbolKind.EventSubscriberDeclaration;
                case memberAttributes.includes('businessevent'): return AZSymbolKind.BusinessEventDeclaration;
                case memberAttributes.includes('integrationevent'): return AZSymbolKind.IntegrationEventDeclaration;
            }
        }
        Err._throw('Could not find kind of procedure.');
    }
}