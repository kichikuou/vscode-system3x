import * as path from 'path';
import { Worker } from 'worker_threads';
import * as vscode from 'vscode';

export class WorkerTerminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;
	private closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;

	constructor(private workerData: any) {}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		this.run();
	}

	close(): void {}

	private async run(): Promise<void> {
		const worker = new Worker(path.join(__dirname, './worker.js'), { workerData: this.workerData });
		worker.on('message', (message) => {
			this.writeEmitter.fire(message + '\r\n');
		});
		worker.on('exit', (exitCode) => {
			this.closeEmitter.fire(exitCode);
		});
	}
}
