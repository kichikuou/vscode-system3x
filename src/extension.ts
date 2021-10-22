import { execFile, ExecFileException } from 'child_process';
import * as vscode from 'vscode';
import { Xsys35cTaskProvider } from './taskProvider';
import { Xsystem35DebugAdapterFactory } from './adapter';
import { decompileWorkspace } from './decompile';

type Dependency = { name: string, versionFlag: string, minimumRequired: string, config: string }
const dependencies: Dependency[] = [
	{
		name: 'xsys35dc',
		versionFlag: '--version',
		minimumRequired: '1.7.0',
		config: 'xsys35dcPath'
	},
	{
		name: 'xsys35c',
		versionFlag: '--version',
		minimumRequired: '1.7.0',
		config: 'xsys35cPath'
	},
	{
		name: 'xsystem35',
		versionFlag: '-version',
		minimumRequired: '2.0.0',
		config: 'xsystem35Path'
	},
];

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.tasks.registerTaskProvider('xsys35c', new Xsys35cTaskProvider()),
		vscode.debug.registerDebugConfigurationProvider('xsystem35', new Xsystem35ConfigurationProvider()),
		vscode.debug.registerDebugAdapterDescriptorFactory('xsystem35', new Xsystem35DebugAdapterFactory()),
		vscode.commands.registerCommand('system3x.decompile', decompileWorkspace),
		vscode.workspace.onDidChangeConfiguration(handleConfigurationChange),
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

	for (const dep of dependencies) {
		checkDependency(dep);
	}
}

function handleConfigurationChange(event: vscode.ConfigurationChangeEvent) {
	for (const dep of dependencies) {
		if (event.affectsConfiguration('system3x.' + dep.config)) {
			checkDependency(dep);
		}
	}
}

function checkProgramVersion(path: string, dep: Dependency): Promise<string | null> {
	return new Promise((resolve, reject) => {
		execFile(path, [dep.versionFlag], async (error: ExecFileException | null, stdout: string, stderr: string) => {
			if (error) {
				if (error.code === 'ENOENT') {
					resolve(`${path} is not found.`);
				} else {
					resolve(`Cannot execute ${path} (Code: ${error.code}).`);
				}
				return;
			}
			const minimum = dep.minimumRequired.match(/^(\d+)\.(\d+)\.(\d+)$/)
			if (!minimum) {
				reject(new Error('invalid argument'));
				return;
			}
			const ver = stdout.match(/(\d+)\.(\d+)\.(\d+)/);
			if (!ver) {
				resolve(`Cannot get version of ${path}`);
				return;
			}
			for (let i = 1; i <= 3; i++) {
				if (Number(ver[i]) < Number(minimum[i])) {
					resolve(`The version of ${path} (${ver[0]}) does not meet the requirements of the extension (${dep.minimumRequired}). Please update the program.`);
					return;
				}
				if (Number(ver[i]) > Number(minimum[i])) {
					break;
				}
			}
			resolve(null);
		});
	});
}

async function checkDependency(dep: Dependency) {
	const config = vscode.workspace.getConfiguration('system3x');
	const value = config.get(dep.config) as string;
	const errmsg = await checkProgramVersion(value, dep);
	if (!errmsg) {
		return;
	}
	const pick = `Set ${dep.name} location`;
	const cmd = await vscode.window.showWarningMessage(errmsg, pick);
	if (cmd === pick) {
		const picked = await vscode.window.showOpenDialog({ title: pick });
		if (picked) {
			const uri = picked[0];
			config.update(dep.config, uri.fsPath, vscode.ConfigurationTarget.Global);
		}
	}
}

class Xsystem35ConfigurationProvider implements vscode.DebugConfigurationProvider {
	resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
		// If config is empty (no launch.json), copy initialConfigurations from our package.json.
		if (Object.keys(config).length === 0) {
			const packageJSON = vscode.extensions.getExtension('kichikuou.system3x')?.packageJSON;
			if (packageJSON) {
				Object.assign(config, packageJSON.contributes.debuggers[0].initialConfigurations[0]);
			}
		}
		return config;
	}
}

export function deactivate() { }
