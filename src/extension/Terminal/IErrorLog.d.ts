declare module ErrorLog {
    export interface Log {
        version: string
        toolInfo: { toolName: string, productVersion: string, fileVersion: string }
        issues: Issue[]
    }
    export interface Issue {
        ruleId: string
        locations: IssueLocation[]
        shortMessage: string
        fullMessage: string
        properties: IssueProperties
    }
    export interface IssueLocation {
        analysisTarget: IssueLocationAnalysisTarget[]
    }
    export interface IssueLocationAnalysisTarget {
        uri: string
        region: IssueLocationAnalysisTargetRegion
    }
    export interface IssueLocationAnalysisTargetRegion {
        startLine: number
        startColumn: number
        endLine: number
        endColumn: number
    }
    export interface IssueProperties {
        severity: string
        warningLevel: string
        defaultSeverity: string
        title: string
        category: string
        isEnabledByDefault: string
        isSuppressedInSource: string
    }
}