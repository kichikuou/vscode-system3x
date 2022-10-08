import * as vscode from 'vscode';
import { WorkerTerminal } from './terminal';

export class Xsys35cTaskProvider implements vscode.TaskProvider {
	private getTasksDone: Thenable<vscode.Task[]> | undefined = undefined;

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		if (!this.getTasksDone) {
			this.getTasksDone = getTasks();
		}
		return this.getTasksDone;
	}

	public resolveTask(task: vscode.Task): vscode.Task | undefined {
		if (!task.definition.config) {
			return undefined;
		}
		return createTask(task.definition);
	}
}

async function getTasks(): Promise<vscode.Task[]> {
	const cfgFiles = await vscode.workspace.findFiles('**/xsys35c.cfg');
	const result: vscode.Task[] = [];
	for (const cfg of cfgFiles) {
		result.push(createTask({ type: 'xsys35c', config: cfg.fsPath }));
	}
	return result;
}

function createTask(definition: vscode.TaskDefinition): vscode.Task {
	const xsys35cPath = vscode.workspace.getConfiguration('system3x').xsys35cPath;
	const execution = xsys35cPath
		? new vscode.ShellExecution(xsys35cPath, ['-p', definition.config])
		: new vscode.CustomExecution(
			async (): Promise<vscode.Pseudoterminal> => {
				const workerData = {
					executable: './xsys35c',
					workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
					args: ['-p', 'src/xsys35c.cfg'],
				};
				return new WorkerTerminal(workerData);
			  }
			);
	return new vscode.Task(
		definition, vscode.TaskScope.Workspace, 'build', 'xsys35c',
		execution,
		'$xsys35c');
}
