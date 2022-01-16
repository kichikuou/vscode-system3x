import * as vscode from 'vscode';

// Decompile *SA.ALD and System39.ain in the workspace root directory.
// Decompiled ADV files are written into the `src` subdirectory.
export async function decompileWorkspace() {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		vscode.window.showErrorMessage('No workspace folder.');
		return;
	}
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

	const config = vscode.workspace.getConfiguration('system3x');
	const args: string[] = [].concat(config.xsys35dcOptions);
	args.push('--outdir=src');
	for (const ald of aldFiles) {
		args.push(ald.fsPath);
	}
	for (const ain of ainFiles) {
		args.push(ain.fsPath);
	}
	const xsys35dcPath = config.xsys35dcPath;
	const task = new vscode.Task(
		{ type: 'decompile' }, vscode.TaskScope.Workspace, 'decompile', 'xsys35dc',
		new vscode.ShellExecution(xsys35dcPath, args));
	const exitCode = await executeShellTask(task);
	if (exitCode !== 0) {
		vscode.window.showErrorMessage('Decompilation failed. See terminal log for details.');
		return;
	}

	// Modify xsys35c.cfg so that build output will be written in the workspace root.
	const cfgUri = vscode.Uri.joinPath(folder.uri, 'src', 'xsys35c.cfg');
	const cfgData = await vscode.workspace.fs.readFile(cfgUri);
	let cfgStr = Buffer.from(cfgData).toString('utf-8');
	cfgStr = cfgStr.replace('ald_basename = ', 'ald_basename = ../');
	cfgStr = cfgStr.replace('output_ain = ', 'output_ain = ../');
	cfgStr += '\ndebug = true\n';
	await vscode.workspace.fs.writeFile(cfgUri, Buffer.from(cfgStr, 'utf8'));

	// Open an ADV file so that the user can start debugging just by pressing F5.
	const hedUri = vscode.Uri.joinPath(folder.uri, 'src', 'xsys35dc.hed');
	const hedData = await vscode.workspace.fs.readFile(hedUri);
	const firstAdv = Buffer.from(hedData).toString('utf-8').split(/\r?\n/)[1];
	const advUri = vscode.Uri.joinPath(folder.uri, 'src', firstAdv);
	await vscode.commands.executeCommand('vscode.open', advUri);
}

async function executeShellTask(task: vscode.Task): Promise<number | undefined> {
	const execution = await vscode.tasks.executeTask(task);

	return new Promise(resolve => {
		let disposable = vscode.tasks.onDidEndTaskProcess(e => {
			if (e.execution === execution) {
				disposable.dispose();
				resolve(e.exitCode);
			}
		});
	});
}
