export class FullSyntaxTreeNodeKind {
    public static getLabelDataType(): string {
        return 'LabelDataType';
    }
    public static getLabel(): string {
        return 'Label';
    }
    public static getXmlPortSchema(): string {
        return 'XmlPortSchema'; //inside a schema are textelements, fieldelements, ..
    }
    public static getPageField(): string {
        return 'PageField';
    }
    public static getPageAction(): string {
        return 'PageAction';
    }
    public static getPagePart(): string {
        return 'PagePart';
    }
    public static getField(): string {
        return 'Field'; //Tablefield or Pagefield
    }
    public static getFieldModification(): string {
        return 'FieldModification';
    }
    public static getTableObject(): string {
        return 'TableObject';
    }
    public static getTableExtensionObject(): string {
        return 'TableExtensionObject';
    }
    public static getPageObject(): string {
        return 'PageObject';
    }
    public static getPageExtensionObject(): string {
        return 'PageExtensionObject';
    }
    public static getPageCustomizationObject(): string {
        return 'PageCustomizationObject';
    }
    public static getCodeunitObject(): string {
        return 'CodeunitObject';
    }
    public static getReportObject(): string {
        return 'ReportObject';
    }
    public static getXmlPortObject(): string {
        return 'XmlPortObject';
    }
    public static getQueryObject(): string {
        return 'QueryObject';
    }
    public static getEnumType(): string {
        return 'EnumType';
    }
    public static getEnumExtensionType(): string {
        return 'EnumExtensionType';
    }
    public static getProfileObject(): string {
        return 'ProfileObject';
    }
    public static getInterface(): string {
        return 'Interface';
    }
    public static getRequestPage(): string {
        return 'RequestPage';
    }
    public static getReportDataItem(): string {
        return 'ReportDataItem';
    }
    public static getPropertyList(): string {
        return 'PropertyList';
    }
    public static getProperty(): string {
        return 'Property';
    }
    public static getAssignmentStatement(): string {
        return 'AssignmentStatement';
    }
    public static getCompoundAssignmentStatement(): string {
        return 'CompoundAssignmentStatement'; // +=
    }
    public static getSubtractExpression(): string {
        return 'SubtractExpression';
    }
    public static getAddExpression(): string {
        return 'AddExpression';
    }
    public static getMultiplyExpression(): string {
        return 'MultiplyExpression';
    }
    public static getDivideExpression(): string {
        return 'DivideExpression';
    }
    public static getTriggerDeclaration(): string {
        return 'TriggerDeclaration';
    }
    public static getMethodDeclaration(): string {
        return 'MethodDeclaration';
    }
    public static getMemberAttribute(): string {
        return 'MemberAttribute';
    }
    public static getGlobalVarSection(): string {
        return 'GlobalVarSection';
    }
    public static getVarSection(): string {
        return 'VarSection';
    }
    public static getVariableDeclaration(): string {
        return 'VariableDeclaration';
    }
    public static getVariableListDeclaration(): string {
        return 'VariableListDeclaration';
    }
    public static getVariableDeclarationName(): string {
        return 'VariableDeclarationName';
    }
    public static getMemberAccessExpression(): string {
        return 'MemberAccessExpression';
    }
    public static getInListExpression(): string {
        return 'InListExpression';
    }
    public static getBracketedArgumentList(): string {
        return 'BracketedArgumentList';
    }
    public static getIdentifierName(): string {
        return 'IdentifierName';
    }
    public static getBlock(): string {
        return 'Block';
    }
    public static getInvocationExpression(): string {
        return 'InvocationExpression';
    }
    public static getExpressionStatement(): string {
        return 'ExpressionStatement';
    }
    public static getIfStatement(): string {
        return 'IfStatement';
    }
    public static getCaseStatement(): string {
        return 'CaseStatement';
    }
    public static getCaseLine(): string {
        return 'CaseLine';
    }
    public static getCaseElse(): string {
        return 'CaseElse';
    }
    public static getWithStatement(): string {
        return 'WithStatement';
    }
    public static getRepeatStatement(): string {
        return 'RepeatStatement';
    }
    public static getWhileStatement(): string {
        return 'WhileStatement';
    }
    public static getForEachStatement(): string {
        return 'ForEachStatement';
    }
    public static getForStatement(): string {
        return 'ForStatement';
    }
    public static getLogicalAndExpression(): string {
        return 'LogicalAndExpression';
    }
    public static getLogicalOrExpression(): string {
        return 'LogicalOrExpression';
    }
    public static getUnaryNotExpression(): string {
        return 'UnaryNotExpression';
    }
    public static getLessThanExpression(): string {
        return 'LessThanExpression';
    }
    public static getLessThanOrEqualExpression(): string {
        return 'LessThanOrEqualExpression';
    }
    public static getGreaterThanExpression(): string {
        return 'GreaterThanExpression';
    }
    public static getGreaterThanOrEqualExpression(): string {
        return 'GreaterThanOrEqualExpression';
    }
    public static getNotEqualsExpression(): string {
        return 'NotEqualsExpression'; //<>
    }
    public static getEqualsExpression(): string {
        return 'EqualsExpression';
    }
    public static getParenthesizedExpression(): string {
        return 'ParenthesizedExpression'; //(counter > 5)
    }
    public static getOptionAccessExpression(): string {
        return 'OptionAccessExpression';
    }
    public static getArrayIndexExpression(): string {
        return 'ArrayIndexExpression';
    }
    public static getParameterList(): string {
        return 'ParameterList';
    }
    public static getParameter(): string {
        return 'Parameter';
    }
    public static getArgumentList(): string {
        return 'ArgumentList';
    }
    public static getAttributeArgumentList(): string {
        return 'AttributeArgumentList';
    }
    public static getLiteralAttributeArgument(): string {
        return 'LiteralAttributeArgument';
    }
    public static getExitStatement(): string {
        return 'ExitStatement';
    }
    public static getReturnValue(): string {
        return "ReturnValue";
    }
    public static getLiteralExpression(): string {
        return 'LiteralExpression';
    }
    public static getBooleanLiteralValue(): string {
        return 'BooleanLiteralValue';
    }
    public static getStringLiteralValue(): string {
        return 'StringLiteralValue';
    }
    public static getInt32SignedLiteralValue(): string {
        return 'Int32SignedLiteralValue';
    }
    public static getDecimalSignedLiteralValue(): string {
        return 'DecimalSignedLiteralValue';
    }
    public static getUnaryMinusExpression(): string {
        return 'UnaryMinusExpression';
    }
    public static getUnaryPlusExpression(): string {
        return 'UnaryPlusExpression';
    }
    public static getObjectId(): string {
        return 'ObjectId';
    }
    public static getObjectReference(): string {
        return 'ObjectReference';
    }
    public static getAllStatementKinds(): string[] {
        return [
            FullSyntaxTreeNodeKind.getIfStatement(),
            FullSyntaxTreeNodeKind.getForStatement(),
            FullSyntaxTreeNodeKind.getCaseStatement(),
            FullSyntaxTreeNodeKind.getExitStatement(),
            FullSyntaxTreeNodeKind.getWithStatement(),
            FullSyntaxTreeNodeKind.getWhileStatement(),
            FullSyntaxTreeNodeKind.getRepeatStatement(),
            FullSyntaxTreeNodeKind.getForEachStatement(),
            FullSyntaxTreeNodeKind.getAssignmentStatement(),
            FullSyntaxTreeNodeKind.getCompoundAssignmentStatement(),
            FullSyntaxTreeNodeKind.getExpressionStatement()
        ];
    }
}