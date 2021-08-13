import { error } from "console";
import * as assert from 'assert';
import { CancellationToken, InputBoxOptions, QuickPickItem, QuickPickOptions } from "vscode";

export class vscodeMock {
    window: any
    expected: { function: VSCodeFunctions, values: any }[] = []
    constructor() {
        this.window = {
            showQuickPick: (items: QuickPickItem[], options: QuickPickOptions & { canPickMany: true; }, token?: CancellationToken) => {
                let expectedPicks: { items: any[], result: any[] | undefined }[] = this.expected.find((value) => value.function == VSCodeFunctions.QuickPick)!.values
                // let expectedPicks = this.expected.find((value) => value.function == VSCodeFunctions.QuickPick)!.values
                let expectedPick: { items: any[], result: any[] | undefined } | undefined = expectedPicks.shift()
                if (!expectedPick)
                    throw error(`Unexpected pick: ${JSON.stringify(items)}`)
                else
                    assert.strictEqual(JSON.stringify(items), JSON.stringify(expectedPick.items))
                return expectedPick.result
            },
            showInputBox: (options?: InputBoxOptions, token?: CancellationToken): string | undefined => {
                let expectedInputBoxes: { options: InputBoxOptions, result: string | undefined }[] = this.expected.find((value) => value.function == VSCodeFunctions.QuickInput)!.values
                let expectedInputBox: { options: InputBoxOptions, result: string | undefined } | undefined = expectedInputBoxes.shift()
                if (!expectedInputBox)
                    throw error(`Unexpected input box: ${JSON.stringify(options)}`)
                else
                    assert.strictEqual(JSON.stringify(options), JSON.stringify(expectedInputBox.options))
                return expectedInputBox.result
            }
        }
    }
    finalize(): boolean {
        return this.expected.every((value) => value.values.length == 0)
    }
}
export enum VSCodeFunctions {
    QuickPick,
    QuickInput
}