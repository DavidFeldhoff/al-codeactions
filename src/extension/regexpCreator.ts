export class RegExpCreator{
    public static matchVariableDeclaration = /^(?<isVar>var )?(?<variableName>"[ \w.-]+"|\w+)\s*:\s*(?:array\s*\[(?<dimensions>[ \d,]+)\] of )?(?<variableType>\w+)\s*(?:\[(?<length>\d+)\]|(?<variableSubtype>"[ \w.-]+"|\w+)(?<isTemporary> temporary)?)?/i;
}