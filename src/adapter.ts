import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as vscode from 'vscode';

export class Xsystem35DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		const configuration = session.configuration;
		if (configuration.trace) {
			return new vscode.DebugAdapterInlineImplementation(new LoggingDebugAdapter(configuration));
		} else {
			return new vscode.DebugAdapterExecutable(configuration.executable, ['-debug_dap'], { cwd: configuration.runDir });
		}
	}
}

class LoggingDebugAdapter implements vscode.DebugAdapter {
	private sendMessage = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
	readonly onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage> = this.sendMessage.event;
	private xsys35: ChildProcessWithoutNullStreams | null = null;
	private rawData = Buffer.allocUnsafe(0);
	private contentLength = -1;

	constructor(configuration: vscode.DebugConfiguration) {
		this.xsys35 = spawn(configuration.executable, ['-debug_dap'], { cwd: configuration.runDir });
		this.xsys35.on('error', (err) => console.error(err));
		this.xsys35.on('exit', (code) => console.log('xsystem35 exited with code ' + code));
		this.xsys35.stdout.on('data', this.onXsys35Output.bind(this));
		this.xsys35.stderr.on('data', (data) => {
			console.warn('xsys35: ' + data);
		});
	}

	public handleMessage(message: vscode.DebugProtocolMessage): void {
		console.log(message);
		const json = JSON.stringify(message);
		this.xsys35!.stdin.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`, 'utf8');
	}

	public dispose(): any {
	}

	private async onXsys35Output(data: Buffer) {
		this.rawData = Buffer.concat([this.rawData, data]);
		while (true) {
			if (this.contentLength >= 0) {
				if (this.rawData.length >= this.contentLength) {
					const message = this.rawData.toString('utf8', 0, this.contentLength);
					this.rawData = this.rawData.slice(this.contentLength);
					this.contentLength = -1;
					if (message.length > 0) {
						try {
							const obj = JSON.parse(message);
							console.log(obj);
							this.sendMessage.fire(obj);
						} catch (e: any) {
							console.warn((e.message || e) + '\n' + message);
						}
					}
					continue;	// there may be more complete messages to process
				}
			} else {
				const idx = this.rawData.indexOf('\r\n\r\n');
				if (idx !== -1) {
					const header = this.rawData.toString('utf8', 0, idx);
					const lines = header.split(/\r?\n/);
					for (const h of lines) {
						const kvPair = h.split(/: */);
						if (kvPair[0] === 'Content-Length') {
							this.contentLength = Number(kvPair[1]);
						}
					}
					this.rawData = this.rawData.slice(idx + 4);
					continue;
				}
			}
			break;
		}
	}
}
