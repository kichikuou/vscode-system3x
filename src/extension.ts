import { execFile, ExecFileException } from 'child_process';
import * as vscode from 'vscode';
import { Xsys35cTaskProvider } from './taskProvider';
import { Xsystem35DebugAdapterFactory } from './adapter';
import { decompileWorkspace } from './decompile';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.tasks.registerTaskProvider('xsys35c', new Xsys35cTaskProvider()),
		vscode.debug.registerDebugConfigurationProvider('xsystem35', new Xsystem35ConfigurationProvider()),
		vscode.debug.registerDebugAdapterDescriptorFactory('xsystem35', new Xsystem35DebugAdapterFactory()),
		vscode.commands.registerCommand('system3x.decompile', decompileWorkspace),
	);

	// Override VS Code's default implementation of the debug hover.
	vscode.languages.registerEvaluatableExpressionProvider('system35', {
		provideEvaluatableExpression(
			document: vscode.TextDocument,
			position: vscode.Position
		): vscode.ProviderResult<vscode.EvaluatableExpression> {
			const wordRange = document.getWordRangeAtPosition(position);
			if (wordRange) {
				return new vscode.EvaluatableExpression(wordRange);
			}
			return undefined; // nothing evaluatable found under mouse
		}
	});

	checkProgramVersion('xsys35dc', '--version', 'xsys35dcPath');
	checkProgramVersion('xsys35c', '--version', 'xsys35cPath');
	checkProgramVersion('xsystem35', '-version', 'xsystem35Path');
}

function getProgramVersion(path: string, arg: string): Promise<string | null> {
	return new Promise((resolve) => {
		execFile(path, [arg], async (error: ExecFileException | null, stdout: string, stderr: string) => {
			resolve(error ? null : stdout);
		});
	});
}

async function checkProgramVersion(name: string, arg: string, configSection: string, value?: string) {
	const config = vscode.workspace.getConfiguration('system3x');
	if (!value) {
		value = config.get(configSection) as string;
	}
	const version = await getProgramVersion(value, arg);
	if (!version) {
		const pick = `Specify ${name} location`;
		const cmd = await vscode.window.showWarningMessage(`"${value}" is not found.`, pick);
		if (cmd === pick) {
			const picked = await vscode.window.showOpenDialog({ title: pick });
			if (picked) {
				const uri = picked[0];
				config.update(configSection, uri.fsPath, vscode.ConfigurationTarget.Global);
				// Try again.
				checkProgramVersion(name, arg, configSection, uri.fsPath);
			}
		}
	} else {
		console.log(version);
	}
}

class Xsystem35ConfigurationProvider implements vscode.DebugConfigurationProvider {
	resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
		const xsystem35Path = vscode.workspace.getConfiguration('system3x').xsystem35Path;
		config.type = 'xsystem35';
		config.name = 'Debug';
		config.request = 'launch';
		config.executable = xsystem35Path;
		config.runDir = '${workspaceFolder}';
		config.srcDir = '${workspaceFolder}/src';
		config.preLaunchTask = 'xsys35c: build';
		return config;
	}
}

export function deactivate() { }
