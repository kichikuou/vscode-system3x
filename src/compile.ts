import * as vscode from 'vscode';
import { WorkerTerminal } from './terminal';

export const taskType = 'xsys35c';

export class CompileTaskProvider implements vscode.TaskProvider {
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
	const result: vscode.Task[] = [];
	for (const compiler of ['xsys35c', 'sys3c']) {
		for (const cfg of await vscode.workspace.findFiles(`**/${compiler}.cfg`)) {
			result.push(createTask({ type: taskType, compiler, config: cfg.fsPath }));
		}
	}
	return result;
}

function createTask(definition: vscode.TaskDefinition): vscode.Task {
	const compilerPath = vscode.workspace.getConfiguration('system3x')[`${definition.compiler}Path`];
	const execution = compilerPath
		? new vscode.ShellExecution(compilerPath, ['--debug', '--outdir=.', '-p', definition.config])
		: new vscode.CustomExecution(
			async (): Promise<vscode.Pseudoterminal> => {
				const workerData = {
					executable: `./${definition.compiler}`,
					workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
					args: ['--debug', '--outdir=.', '-p', vscode.workspace.asRelativePath(definition.config, false)],
				};
				return new WorkerTerminal(workerData);
			  }
			);
	const task = new vscode.Task(
		definition, vscode.TaskScope.Workspace, 'build', definition.type,
		execution, '$xsys35c');
	task.group = vscode.TaskGroup.Build;
	return task;
}
