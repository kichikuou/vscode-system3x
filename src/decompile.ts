import * as vscode from 'vscode';
import { WorkerTerminal } from './terminal';
import { taskType } from './compile';

// Decompile *SA.ALD and System39.ain in the workspace root directory.
// Decompiled ADV files are written into the `src` subdirectory.
export async function decompileWorkspace() {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		vscode.window.showErrorMessage('No workspace folder.');
		return;
	}
	const files = await getDecompilerInputFiles(folder);
	if (!files) {
		return;
	}
	const config = vscode.workspace.getConfiguration('system3x');
	const options: string[] = [].concat(config.xsys35dcOptions);
	let exitCode: number | undefined;
	if (config.xsys35dcPath) {
		exitCode = await decompileWithExternalDecompiler(config.xsys35dcPath, options, files);
	} else {
		exitCode = await decompileInProcess(folder.uri.fsPath, options, files);
	}
	if (exitCode !== 0) {
		vscode.window.showErrorMessage('Decompilation failed. See terminal log for details.');
		return;
	}
	await updateConfigFile(folder.uri);
	await openAdv(folder.uri);
}

function decompileWithExternalDecompiler(decompilerPath: string, args: string[], files: vscode.Uri[]): Promise<number | undefined> {
	args.push('--outdir=src');
	for (const f of files) {
		args.push(f.fsPath);
	}
	return executeDecompilation(new vscode.ShellExecution(decompilerPath, args));
}

function decompileInProcess(workspaceRoot: string, args: string[], files: vscode.Uri[]): Promise<number | undefined> {
	args.push('--outdir=/workspace/src');
	for (const file of files) {
		args.push('/workspace/' + vscode.workspace.asRelativePath(file));
	}
	const workerData = {
		executable: './xsys35dc',
		workspaceRoot,
		args,
	};
	return executeDecompilation(new vscode.CustomExecution(async () => new WorkerTerminal(workerData)));
}

async function getDecompilerInputFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[] | undefined> {
	if ((await vscode.workspace.findFiles(new vscode.RelativePattern(folder, 'src/*'), null, 1)).length > 0) {
		const selected = await vscode.window.showWarningMessage(
			'"src" folder already exists. Decompile anyway?', {modal: true}, 'Yes');
		if (selected !== 'Yes') {
			return;
		}
	}
	const aldFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '*[sS]?.[aA][lL][dD]'));
	if (aldFiles.length === 0) {
		vscode.window.showErrorMessage('No *SA.ALD files in the workspace root folder.');
		return;
	}
	const ainFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '[sS][yY][sS][tT][eE][mM]39.[aA][iI][nN]'));
	return aldFiles.concat(ainFiles);
}

// Modify xsys35c.cfg so that build output will be written in the workspace root.
async function updateConfigFile(workspaceUri: vscode.Uri) {
	const cfgUri = vscode.Uri.joinPath(workspaceUri, 'src', 'xsys35c.cfg');
	const cfgData = await vscode.workspace.fs.readFile(cfgUri);
	let cfgStr = Buffer.from(cfgData).toString('utf-8');
	cfgStr = cfgStr.replace('ald_basename = ', 'ald_basename = ../');
	cfgStr = cfgStr.replace('output_ain = ', 'output_ain = ../');
	cfgStr += '\ndebug = true\n';
	await vscode.workspace.fs.writeFile(cfgUri, Buffer.from(cfgStr, 'utf8'));
}

// Open an ADV file so that the user can start debugging just by pressing F5.
async function openAdv(workspaceUri: vscode.Uri) {
	const hedUri = vscode.Uri.joinPath(workspaceUri, 'src', 'xsys35dc.hed');
	const hedData = await vscode.workspace.fs.readFile(hedUri);
	const firstAdv = Buffer.from(hedData).toString('utf-8').split(/\r?\n/)[1];
	const advUri = vscode.Uri.joinPath(workspaceUri, 'src', firstAdv);
	await vscode.commands.executeCommand('vscode.open', advUri);
}

async function executeDecompilation(execution: vscode.ShellExecution | vscode.CustomExecution): Promise<number | undefined> {
	const task = new vscode.Task(
		{ type: taskType }, vscode.TaskScope.Workspace, 'decompile', 'xsys35dc', execution);
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
