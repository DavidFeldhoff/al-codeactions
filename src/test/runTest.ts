import * as cp from 'child_process';
import * as path from 'path';

import { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download VS Code and unzip it
		const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
		const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

		// Install dependent extensions
		cp.spawnSync(cli, [...args,'--install-extension', 'ms-dynamics-smb.al'], {
			encoding: 'utf-8',
			stdio: 'inherit'
		});
		//currently the al code outline can't be activated in the hosted agents due to a permission error on a Mac operationg system
		// cp.spawnSync(cliPath, ['--install-extension', 'andrzejzwierzchowski.al-code-outline'], {
		// 	encoding: 'utf-8',
		// 	stdio: 'inherit'
		// });

		// Run the extension test
		await runTests({ vscodeExecutablePath, extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
