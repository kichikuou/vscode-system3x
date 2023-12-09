import { parentPort, workerData } from 'worker_threads';

if (parentPort === null) {
	process.exit(1);
}
if (!workerData.workspaceRoot) {
	parentPort.postMessage('workerData.workspaceRoot is not set.');
	process.exit(1);
}

async function workerMain() {
	const Module: any = {
		onRuntimeInitialized: () => {
			Module.FS.mkdir('/workspace');
			Module.FS.mount(Module.NODEFS, { root: workerData.workspaceRoot }, '/workspace');
			Module.FS.chdir('/workspace');
		},
		arguments: workerData.args,
		print: (s: string) => parentPort!.postMessage(s),
		printErr: (s: string) => parentPort!.postMessage(s),
	};
	const instance = require(workerData.executable);
	await instance(Module);
}

workerMain().catch((err) => {
	console.log(err);
	if (err instanceof Error) {
		parentPort!.postMessage(err.message);
	}
	process.exit(1);
});
