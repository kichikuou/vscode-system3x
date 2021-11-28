import { performance } from 'perf_hooks';
import * as vscode from 'vscode';

export class System3xDefinitionProvider implements vscode.DefinitionProvider {
	private definitions: Map<string, Map<string, number> | null> = new Map();

	constructor(context: vscode.ExtensionContext) {
		context.subscriptions.push(
			vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this)),
		);
	}

	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition | vscode.DefinitionLink[] | undefined> {
		await this.updateIndex();
		const symbol = document.getText(document.getWordRangeAtPosition(position));
		const results: vscode.Location[] = [];
		for (let [uri, map] of this.definitions) {
			const line = map!.get(symbol);
			if (line !== undefined) {
				results.push(new vscode.Location(vscode.Uri.parse(uri), new vscode.Position(line, 0)));
			}
		}
		return results.length > 0 ? results : undefined;
	}

	onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
		if (this.definitions.size !== 0) {
			this.definitions.set(event.document.uri.toString(), null);
		}
	}

	private async updateIndex() {
		const startTime = performance.now();
		const promises: Promise<void>[] = [];
		if (this.definitions.size == 0) {
			// Index all files.
			const advFiles = await vscode.workspace.findFiles('**/*.[aA][dD][vV]');
			for (const adv of advFiles) {
				promises.push(this.index(adv));
			}
		} else {
			// Re-index dirty files.
			for (let [uri, map] of this.definitions) {
				if (!map) {
					promises.push(this.index(vscode.Uri.parse(uri)));
				}
			}
		}
		if (promises.length > 0) {
			await Promise.all(promises);
			console.log('indexed', promises.length, 'files in', Math.round(performance.now() - startTime), 'ms');
		}
	}

	private async index(uri: vscode.Uri): Promise<void> {
		const map: Map<string, number> = new Map();
		try {
			const content = await vscode.workspace.fs.readFile(uri);
			let lines = Buffer.from(content).toString('utf-8').split('\n');
			for (let i = 0; i < lines.length; i++) {
				const m = lines[i].match(/^(\/\*[^*]*\*\/|\s*)*\*\*\s*([^ \t:]+)/);
				if (m) {
					map.set(m[2], i);
				}
			}
		} catch (e) {
			console.log(e);
		}
		this.definitions.set(uri.toString(), map);
	}
}
