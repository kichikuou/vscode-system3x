import * as vscode from 'vscode';
import { taskType, CompileTaskProvider } from './compile';
import { decompileWorkspace } from './decompile';
import { activateDebugger } from './debugger';
import { System3xDefinitionProvider } from './definition';
import { System3xHoverProvider } from './hover';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.tasks.registerTaskProvider(taskType, new CompileTaskProvider()),
		vscode.commands.registerCommand('system3x.decompile', decompileWorkspace),
		vscode.languages.registerEvaluatableExpressionProvider('system35', new System3xEvaluatableExpressionProvider()),
		vscode.languages.registerDefinitionProvider('system35', new System3xDefinitionProvider(context)),
		vscode.languages.registerHoverProvider('system35', new System3xHoverProvider()),
	);
	activateDebugger(context);
}

export function deactivate() { }

class System3xEvaluatableExpressionProvider implements vscode.EvaluatableExpressionProvider {
	provideEvaluatableExpression(
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.ProviderResult<vscode.EvaluatableExpression> {
		const wordRange = document.getWordRangeAtPosition(position);
		if (!wordRange)
			return undefined;
		return new vscode.EvaluatableExpression(wordRange);
	}
}
