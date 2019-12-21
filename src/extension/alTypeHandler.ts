export class ALTypeHandler{
    public static mapVariableTypeToALObjectType(objectTypeOfDiagnosticMsg: string): string {
        switch (objectTypeOfDiagnosticMsg.toLowerCase()) {
            case "record":
                return "table";
            default:
                return objectTypeOfDiagnosticMsg.toLowerCase();
        }
    }
}