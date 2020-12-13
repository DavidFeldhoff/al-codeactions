export interface IFixCop {
    resolve(): void
    compilationCallback(errorLogIssues: ErrorLog.Issue[]): void
}