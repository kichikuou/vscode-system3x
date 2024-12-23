import * as vscode from 'vscode';
import { WorkerTerminal } from './terminal';
import { taskType } from './compile';

type Decompiler = 'xsys35dc' | 'sys3dc';

// Decompile System 3.x game (*SA.ALD and System39.ain) or System 1-3 game
// (?DISK.DAT) in the workspace root directory. Decompiled ADV files are
// written into the `src` subdirectory.
export async function decompileWorkspace() {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		vscode.window.showErrorMessage('No workspace folder.');
		return;
	}
	const { decompiler, files } = await getDecompilerInput(folder) || {};
	if (!decompiler || !files) return;

	const config = vscode.workspace.getConfiguration('system3x');
	const options: string[] = [].concat(config[`${decompiler}Options`]);
	let exitCode: number | undefined;
	const decompilerPath = config[`${decompiler}Path`];
	if (decompilerPath) {
		exitCode = await decompileWithExternalDecompiler(decompilerPath, options, files);
	} else {
		exitCode = await decompileInProcess(folder.uri.fsPath, decompiler, options, files);
	}
	if (exitCode !== 0) {
		vscode.window.showErrorMessage('Decompilation failed. See terminal log for details.');
		return;
	}
	await updateConfigFile(decompiler, folder.uri);
	await openAdv(decompiler, folder.uri);
}

function decompileWithExternalDecompiler(decompilerPath: string, args: string[], files: vscode.Uri[]): Promise<number | undefined> {
	args.push('--outdir=src');
	for (const f of files) {
		args.push(f.fsPath);
	}
	return executeDecompilation(new vscode.ShellExecution(decompilerPath, args));
}

function decompileInProcess(workspaceRoot: string, decompiler: Decompiler, args: string[], files: vscode.Uri[]): Promise<number | undefined> {
	args.push('--outdir=/workspace/src');
	for (const file of files) {
		args.push('/workspace/' + vscode.workspace.asRelativePath(file));
	}
	const workerData = {
		executable: `./${decompiler}`,
		workspaceRoot,
		args,
	};
	return executeDecompilation(new vscode.CustomExecution(async () => new WorkerTerminal(workerData)));
}

async function getDecompilerInput(folder: vscode.WorkspaceFolder): Promise<{decompiler: Decompiler, files: vscode.Uri[]} | undefined> {
	if ((await vscode.workspace.findFiles(new vscode.RelativePattern(folder, 'src/*'), null, 1)).length > 0) {
		const selected = await vscode.window.showWarningMessage(
			'"src" folder already exists. Decompile anyway?', {modal: true}, 'Yes');
		if (selected !== 'Yes') {
			return;
		}
	}

	const datFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '?[dD][iI][sS][kK].[dD][aA][tT]'));
	if (datFiles.length > 0) {
		const ag00 = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '[aA][gG]00.[dD][aA][tT]'));
		return { decompiler: 'sys3dc', files: datFiles.concat(ag00) };
	}

	const aldFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '*[sS]?.[aA][lL][dD]'));
	if (aldFiles.length === 0) {
		vscode.window.showErrorMessage('No *SA.ALD files or ?DISK.DAT files in the workspace root folder.');
		return;
	}
	const ainFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '[sS][yY][sS][tT][eE][mM]39.[aA][iI][nN]'));
	return { decompiler: 'xsys35dc', files: aldFiles.concat(ainFiles) };
}

// Modify the project file so that build output will be written in the workspace root.
async function updateConfigFile(decompiler: Decompiler, workspaceUri: vscode.Uri) {
	const cfgName = decompiler === 'xsys35dc' ? 'xsys35c.cfg' : 'sys3c.cfg';
	const cfgUri = vscode.Uri.joinPath(workspaceUri, 'src', cfgName);
	const cfgData = await vscode.workspace.fs.readFile(cfgUri);
	let cfgStr = Buffer.from(cfgData).toString('utf-8');
	if (decompiler === 'xsys35dc') {
		cfgStr = cfgStr.replace('ald_basename = ', 'ald_basename = ../');
		cfgStr = cfgStr.replace('output_ain = ', 'output_ain = ../');
	} else {
		cfgStr = cfgStr.replace('adisk_name = ', 'adisk_name = ../');
	}
	cfgStr += '\ndebug = true\n';
	await vscode.workspace.fs.writeFile(cfgUri, Buffer.from(cfgStr, 'utf8'));
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
