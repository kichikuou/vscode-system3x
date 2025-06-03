import * as vscode from 'vscode';
import { WorkerTerminal } from './terminal';
import { taskType } from './compile';

type Decompiler = 'xsys35dc' | 'sys3dc';
const EXIT_UNKNOWN_GAME = 2;

// Decompile System 3.x game (*SA.ALD and System39.ain) or System 1-3 game
// (?DISK.DAT) in the workspace root directory. Decompiled ADV files are
// written into the `src` subdirectory.
export async function decompileWorkspace(gameid?: string) {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		vscode.window.showErrorMessage('No workspace folder.');
		return;
	}
	if (await hasMatchingFiles(folder, 'src/*.cfg')) {
		const selected = await vscode.window.showWarningMessage(
			'"src" folder already exists. Decompile anyway?', {modal: true}, 'Yes');
		if (selected !== 'Yes') {
			return;
		}
	}
	let decompiler: Decompiler | undefined;
	if (await hasMatchingFiles(folder, '*[sS]?.[aA][lL][dD]'))
		decompiler = 'xsys35dc';
	else if (await hasMatchingFiles(folder, '?[dD][iI][sS][kK].[dD][aA][tT]'))
		decompiler = 'sys3dc';
	if (!decompiler) return;

	const config = vscode.workspace.getConfiguration('system3x');
	const args: string[] = [].concat(config[`${decompiler}Options`]);
	if (decompiler === 'sys3dc' && gameid) {
		args.push(`--game=${gameid}`);
	}
	let exitCode: number | undefined;
	const decompilerPath = config[`${decompiler}Path`];
	if (decompilerPath) {
		exitCode = await decompileWithExternalDecompiler(folder.uri.fsPath, decompilerPath, args);
	} else {
		exitCode = await decompileInProcess(folder.uri.fsPath, decompiler, args);
	}
	if (decompiler === 'sys3dc' && exitCode === EXIT_UNKNOWN_GAME && !gameid) {
		// Ask the user for the game ID and try again.
		const gameId = await vscode.window.showInputBox({
			prompt: 'Enter game ID',
			placeHolder: 'e.g. rance41',
			validateInput: (value) => value ? null : 'Game ID cannot be empty.',
		});
		if (gameId) {
			return decompileWorkspace(gameId);
		}
		return;
	}
	if (exitCode !== 0) {
		vscode.window.showErrorMessage('Decompilation failed. See terminal log for details.');
		return;
	}
	await openAdv(decompiler, folder.uri);
}

async function hasMatchingFiles(folder: vscode.WorkspaceFolder, pattern: string): Promise<boolean> {
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, pattern), null, 1);
    return files.length > 0;
}

function decompileWithExternalDecompiler(folder: string, decompilerPath: string, args: string[]): Promise<number | undefined> {
	args.push(folder);
	args.push('--outdir=src');
	return executeDecompilation(new vscode.ShellExecution(decompilerPath, args));
}

function decompileInProcess(workspaceRoot: string, decompiler: Decompiler, args: string[]): Promise<number | undefined> {
	args.push('.');
	args.push('--outdir=/workspace/src');
	const workerData = {
		executable: `./${decompiler}`,
		workspaceRoot,
		args,
	};
	return executeDecompilation(new vscode.CustomExecution(async () => new WorkerTerminal(workerData)));
}

// Open an ADV file so that the user can start debugging just by pressing F5.
async function openAdv(decompiler: Decompiler, workspaceUri: vscode.Uri) {
	const hedUri = vscode.Uri.joinPath(workspaceUri, 'src', `${decompiler}.hed`);
	const hedData = await vscode.workspace.fs.readFile(hedUri);
	const firstAdv = Buffer.from(hedData).toString('utf-8').split(/\r?\n/).find(line => !line.startsWith('#'))!;
	const advUri = vscode.Uri.joinPath(workspaceUri, 'src', firstAdv);
	await vscode.commands.executeCommand('vscode.open', advUri);
}

async function executeDecompilation(execution: vscode.ShellExecution | vscode.CustomExecution): Promise<number | undefined> {
	const task = new vscode.Task(
		{ type: taskType }, vscode.TaskScope.Workspace, 'decompile', taskType, execution);
	const taskExecution = await vscode.tasks.executeTask(task);

	return new Promise(resolve => {
		let disposable = vscode.tasks.onDidEndTaskProcess(e => {
			if (e.execution === taskExecution) {
				disposable.dispose();
				resolve(e.exitCode);
			}
		});
	});
}
