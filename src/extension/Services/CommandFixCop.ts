import { window } from "vscode";
import { Cops } from "../FixCop/BuildOutputCopAnalyzer/Cops";
import { CommandFixAssignedButUnusedVariableAA0206 } from "../FixCop/CommandFixAssignedButUnusedVariableAA0206";
import { CommandFixUnusedVariablesAA0137 } from "../FixCop/CommandFixUnusedVariablesAA0137";
import { IFixCop } from "../FixCop/IFixCop";

export class FixCop {
    async resolve() {
        let cops: Map<Cops, string> = new Map();
        cops.set(Cops.AA0206, 'AA0206 - The value assigned to a variable must be used, otherwise the variable is not necessary.')
        cops.set(Cops.AA0137, 'AA0137 - Do not declare variables that are unused.')

        let whichCop: string | undefined = await window.showQuickPick(Array.from(cops.values()), { placeHolder: 'Which warning do you want to fix?' })
        let impl: IFixCop;
        switch (whichCop) {
            case cops.get(Cops.AA0206):
                impl = new CommandFixAssignedButUnusedVariableAA0206()
                break;
            case cops.get(Cops.AA0137):
                impl = new CommandFixUnusedVariablesAA0137()
                break;
            default:
                return;
        }
        impl.resolve();
    }
}