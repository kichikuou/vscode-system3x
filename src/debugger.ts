import * as vscode from 'vscode';

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
	createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		const config = session.configuration;
		const args = ['-debug_dap', '-debuglv', config.logLevel];
		const options: any = { cwd: config.runDir };
		if (config.env)
			options.env = config.env;
		return new vscode.DebugAdapterExecutable(config.program, args, options);
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
		this.view.webview.html = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					table {
						border-collapse: collapse;
						width: 100%;
					}
					td {
						width: 5vw;
						height: 5vw;
						border: 1px solid #ccc;
					}
				</style>
			</head>
			<body>
				<table id="palette" />
				<script>
					const cells = [];

					function createPaletteGrid() {
						const table = document.getElementById("palette");
						for (let i = 0; i < 16; i++) {
							const row = table.insertRow();
							for (let j = 0; j < 16; j++) {
								cells.push(row.insertCell());
							}
						}
					}

					function updatePaletteGrid(palette) {
						for (let i = 0; i < 256; i++) {
							const color = palette[i];
							const red = (color >> 16) & 0xFF;
							const green = (color >> 8) & 0xFF;
							const blue = color & 0xFF;
							cells[i].style.backgroundColor = \`rgb(\${red}, \${green}, \${blue})\`;
						}
					}

					createPaletteGrid();
					window.addEventListener("message", (e) => updatePaletteGrid(e.data));
					acquireVsCodeApi().postMessage('loaded');
				</script>
			</body>
			</html>
		`;
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
				this.view.webview.postMessage(resp.palette);
			}
		} catch (e) {
			console.log(e);
		}
		this.updating = false;
	}
}
