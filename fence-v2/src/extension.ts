// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { scanner } from './classifier/ast';
import { score } from './classifier/scorer';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	async function runScan() {
		vscode.window.showInformationMessage('Fence scan started');
		try {
			const files = await vscode.workspace.findFiles('**/*.{ts,js}', '**/{node_modules,dist,out,.vscode,test}/**');
			const results = await Promise.all(files.map(file => scanner(file.fsPath)));
			const aggregate = results.reduce((acc, curr) => {
				return {
					totalLines: acc.totalLines + curr.totalLines,
					arrayMethods: acc.arrayMethods + curr.arrayMethods,
					optionalChaining: acc.optionalChaining + curr.optionalChaining,
					nullishCoalescing: acc.nullishCoalescing + curr.nullishCoalescing,
					destructuring: acc.destructuring + curr.destructuring,
					forLoopsOnArrays: acc.forLoopsOnArrays + curr.forLoopsOnArrays,
					functions: acc.functions + curr.functions,
					totalComplexity: acc.totalComplexity + curr.totalComplexity,
					generics: acc.generics + curr.generics,
					higherOrderFns: acc.higherOrderFns + curr.higherOrderFns,
					typeDefinitions: acc.typeDefinitions + curr.typeDefinitions,
					asyncFunctions: acc.asyncFunctions + curr.asyncFunctions,
					handledAsync: acc.handledAsync + curr.handledAsync,
					emptyCatch: acc.emptyCatch + curr.emptyCatch,
					asyncAwait: acc.asyncAwait + curr.asyncAwait,
					varDeclarations: acc.varDeclarations + curr.varDeclarations,
					callbackNesting: acc.callbackNesting + curr.callbackNesting
				};
			});
			const scores = score(aggregate);
			console.log(scores);
		} catch (e) {
			console.error('fence scan error: ', e);
			vscode.window.showErrorMessage('Fence scan failed: ' + e);
		}

	}

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "fence-v2" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('fence.scan', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from fence-v2!');
		runScan();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
