export class RegExpCreator{
    public static matchWholeProcedureCall = /(?:(?<returnVar>"[ \w.-]+"|\w+)\s*:=\s*)?(?:(?<calledObj>"[ \w.-]+"|\w+)\.)?(?<calledProc>"[ \w.-]+"|\w+)\((?<params>.*)\)$/;
    public static matchProcedureOrTriggerDeclarationLine = /(?:procedure|trigger)\s(?<procedurename>"[ \w.-]+"|\w+)\((?<parameterDeclarations>.*)\)(?::\s*(?<returnType>[\w\[\]]+))?(?:\s*;)?$/;
    public static matchObjectDeclarationLine = /^(?<objectType>\w+)\s+(?<objectId>\d+)\s+(?<objectName>"[ \w.-]+"|\w+)/i;
    public static matchVariableDeclaration = /^(?<isVar>var )?(?<variableName>"[ \w.-]+"|\w+)\s*:\s*(?:array\s*\[(?<dimensions>[ \d,]+)\] of )?(?<variableType>\w+)\s*(?:\[(?<length>\d+)\]|(?<variableSubtype>"[ \w.-]+"|\w+)(?<isTemporary> temporary)?)?/i;
}