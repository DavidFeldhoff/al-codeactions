export class RenameMgt {
    private callRename: boolean = false;
    private static myInstance: RenameMgt | undefined;
    private CheckRename() {

    }
    public static getInstance(): RenameMgt {
        if (!this.myInstance) {
            this.myInstance = new RenameMgt();
        }
        return this.myInstance;
    }
    public getCallRename(): boolean {
        return this.callRename;
    }
    public setCallRename(callRename: boolean) {
        this.callRename = callRename;
    }
}