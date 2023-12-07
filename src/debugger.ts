import * as vscode from 'vscode';

export class Xsystem35DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		const config = session.configuration;
		const args = ['-debug_dap', '-debuglv', config.logLevel];
		const options: any = { cwd: config.runDir };
		if (config.env)
			options.env = config.env;
		return new vscode.DebugAdapterExecutable(config.program, args, options);
	}
}

export class Xsystem35DebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
	createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
		const config = session.configuration;
		if (!config.trace) return undefined;
		return {
			onWillReceiveMessage: m => console.log(m),
			onDidSendMessage: m => console.log(m)
		};
	}
}
