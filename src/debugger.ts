/// <reference types="../assets/assets.d.ts" />
import { execFile, ExecFileException } from 'child_process';
import * as vscode from 'vscode';
import palette_view_html from '../assets/palette_view.html';

export function activateDebugger(context: vscode.ExtensionContext) {
	const paletteViewProvider = new PaletteViewProvider();
	context.subscriptions.push(
		vscode.debug.registerDebugAdapterDescriptorFactory('xsystem35', new DebugAdapterFactory()),
		vscode.debug.registerDebugAdapterTrackerFactory('xsystem35', new DebugAdapterTrackerFactory()),
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

class DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	async createDebugAdapterDescriptor(session: vscode.DebugSession) {
		const config = session.configuration;
		const xsystem35 = config.program;
		const options: any = { cwd: config.runDir };
		if (config.env)
			options.env = config.env;

		// vscode.DebugAdapterExecutable silently fails if it can't launch the program.
		// https://github.com/microsoft/vscode/issues/108145
		// We need to check if the program exists and is executable beforehand.
		let err = await this.checkExecutable(xsystem35, ['-version'], options);
		if (err) {
			if (process.platform === 'win32' && xsystem35 == 'xsystem35') {
				err += '\nPlease copy xsystem35.exe to the workspace folder and try again.';
			} else {
				err += '\nPlease install xsystem35 and set the path in the settings.';
			}
			vscode.window.showErrorMessage(err);
		}

		const args = ['-debug_dap', '-debuglv', config.logLevel];
		return new vscode.DebugAdapterExecutable(xsystem35, args, options);
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
			onWillReceiveMessage: m => console.log(m),
			onDidSendMessage: m => console.log(m)
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
