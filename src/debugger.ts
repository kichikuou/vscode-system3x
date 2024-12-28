/// <reference types="../assets/assets.d.ts" />
import { execFile, ExecFileException } from 'child_process';
import * as vscode from 'vscode';
import palette_view_html from '../assets/palette_view.html';

type DebuggerType = 'xsystem35' | 'system3';
const debuggers: DebuggerType[] = ['xsystem35', 'system3'];
export const log = vscode.window.createOutputChannel('System3x extension', { log: true });

export function activateDebugger(context: vscode.ExtensionContext) {
	const paletteViewProvider = new PaletteViewProvider();
	for (const debuggerType of debuggers) {
		context.subscriptions.push(
			vscode.debug.registerDebugConfigurationProvider(debuggerType, new DebugConfigurationProvider(debuggerType)),
			vscode.debug.registerDebugAdapterDescriptorFactory(debuggerType, new DebugAdapterFactory(debuggerType)),
			vscode.debug.registerDebugAdapterTrackerFactory(debuggerType, new DebugAdapterTrackerFactory()),
		);
	}
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('system3x.palette', paletteViewProvider),
		vscode.debug.onDidStartDebugSession((session) => paletteViewProvider.onDidStartDebugSession(session)),
		vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
			switch (e.event) {
				case 'xsystem35.paletteChanged':
					paletteViewProvider.onPaletteChange(e);
					break;
				default:
					console.warn('Unknown event', e.event);
					break;
			}
		}),
	);
}

class DebugConfigurationProvider implements vscode.DebugConfigurationProvider {
	constructor(private type: DebuggerType) {}

	async resolveDebugConfiguration(
		folder: vscode.WorkspaceFolder | undefined,
		config: vscode.DebugConfiguration,
		token?: vscode.CancellationToken
	): Promise<vscode.DebugConfiguration> {
		if (Object.keys(config).length > 0 || !await this.hasConfigFile(folder)) {
			return config;
		}
		// If config is empty (no launch.json), copy initialConfigurations from our package.json.
		const debugConfig =
			vscode.extensions.getExtension('kichikuou.system3x')?.packageJSON?.
			contributes.debuggers.find((d: any) => d.type === this.type);
		if (debugConfig) {
			Object.assign(config, debugConfig.initialConfigurations[0]);
		}
		return config;
	}

	private async hasConfigFile(folder: vscode.WorkspaceFolder | undefined): Promise<boolean> {
		if (!folder) return false;
		const pattern = this.type === 'xsystem35' ? '**/xsys35c.cfg' : '**/sys3c.cfg';
		return (await vscode.workspace.findFiles(new vscode.RelativePattern(folder, pattern), null, 1)).length > 0;
	}
}

class DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	constructor(private type: DebuggerType) {}

	async createDebugAdapterDescriptor(session: vscode.DebugSession) {
		const config = session.configuration;
		const program = config.program;
		const options: any = { cwd: config.runDir };
		if (config.env)
			options.env = config.env;

		// vscode.DebugAdapterExecutable silently fails if it can't launch the program.
		// https://github.com/microsoft/vscode/issues/108145
		// We need to check if the program exists and is executable beforehand.
		let err = await this.checkExecutable(program, ['-version'], options);
		if (err) {
			if (process.platform === 'win32' && program == this.type) {
				err += `\nPlease copy ${this.type}.exe to the workspace folder and try again.`;
			} else {
				err += `\nPlease install ${this.type} and set the path in the settings.`;
			}
			vscode.window.showErrorMessage(err);
		}

		const args = [];
		switch (this.type) {
		case 'xsystem35':
			args.push('-debug_dap', '-debuglv', config.logLevel);
			break;
		case 'system3':
			args.push('-debugger', 'dap');
			break;
		}
		return new vscode.DebugAdapterExecutable(program, args, options);
	}

	private checked = new Set<string>();
	checkExecutable(path: string, args: string[], options: any): Promise<string | null> {
		if (this.checked.has(path)) return Promise.resolve(null);
		return new Promise((resolve) => {
			execFile(path, args, options, (error: ExecFileException | null) => {
				if (error) {
					if (error.code === 'ENOENT') {
						resolve(`${path} is not found.`);
					} else {
						resolve(`Error running ${path}. (Code: ${error.code})`);
					}
				}
				this.checked.add(path);
				resolve(null);
			});
		});
	}
}

class DebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
	createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
		const config = session.configuration;
		if (!config.trace) return undefined;
		return {
			onWillReceiveMessage: m => {
				console.log(m);
				log.info('DAP send', m);
			},
			onDidSendMessage: m => {
				console.log(m);
				log.info('DAP recv', m);
			}
		};
	}
}

class PaletteViewProvider implements vscode.WebviewViewProvider {
	private view?: vscode.WebviewView;
	private ourVersion = -1;
	private theirVersion = 0;
	private updating = false;

	resolveWebviewView(webviewView: vscode.WebviewView) {
		this.view = webviewView;
		this.view.onDidDispose(() => this.view = undefined);
		this.view.webview.options = {
			enableScripts: true,
		};
		this.view.webview.onDidReceiveMessage((data) => {
			if (data === 'loaded') {
				this.ourVersion = -1;
				this.update();
			}
		});
		this.view.webview.html = palette_view_html;
	}

	onDidStartDebugSession(session: vscode.DebugSession) {
		this.ourVersion = -1;
		this.theirVersion = 0;
		this.update();
	}

	onPaletteChange(e: vscode.DebugSessionCustomEvent) {
		this.theirVersion = e.body.version;
		this.update();
	}

	private async update() {
		if (!this.view) return;
		if (this.updating) return;
		this.updating = true;
		try {
			while (this.ourVersion < this.theirVersion) {
				const resp = await vscode.debug.activeDebugSession?.customRequest('xsystem35.palette');
				if (!resp || !this.view) break;
				this.ourVersion = resp.version;
				this.view.webview.postMessage({ palette: resp.palette });
			}
		} catch (e) {
			console.log(e);
			if (this.view) {
				this.view.webview.postMessage({
					error: 'Error reading palette (xsystem35-sdl2 >=2.10.0 required)'
				});
			}
		}
		this.updating = false;
	}
}
