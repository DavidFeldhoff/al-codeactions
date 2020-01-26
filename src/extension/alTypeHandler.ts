import { isNull, isUndefined } from "util";
import { ALObject } from "./alObject";

export class ALTypeHandler{
    
    static getALObjectOfALVariableTypeWhichCanCreateProcedures(type: string): import("./alObject").ALObject | undefined {
        let regex = /(?<objecttype>record|codeunit|page|report)\s*(?<objectname>"[ \w.-]+"|\w+)/i;
        let execArray = regex.exec(type);
        if (isNull(execArray) || isUndefined(execArray.groups)) {
            return undefined;
        }
        let res = execArray.groups;

        let objectName = res["objecttype"];
        let objectSubtype = res["objectname"];
        return new ALObject(objectSubtype,objectName);
    }
    
    public static mapVariableTypeToALObjectType(objectTypeOfDiagnosticMsg: string): string {
        switch (objectTypeOfDiagnosticMsg.toLowerCase()) {
            case "record":
                return "table";
            default:
                return objectTypeOfDiagnosticMsg.toLowerCase();
        }
    }
}