import * as vscode from "vscode";
import * as fs from "fs";
const path = require("path");
import { TextEncoder } from "util";
const cp = require("child_process");
import { estimate } from "./utils/gasusage";

async function createTestFile(testCode: string) {
    // Assuming the root of your workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

    const rootUri = workspaceFolders[0].uri;
    const testFolderUri = vscode.Uri.joinPath(rootUri, "test");
    const testFileUri = vscode.Uri.joinPath(testFolderUri, "testcode.js");

    try {
        // Check if the test folder exists, if not create it
        const testFolderStat = await vscode.workspace.fs.stat(testFolderUri);
    } catch (err: any) {
        if (err.code === "FileNotFound") {
            await vscode.workspace.fs.createDirectory(testFolderUri);
        } else {
            vscode.window.showErrorMessage(
                "Error while checking/creating test directory."
            );
            console.error(err);
            return;
        }
    }
    // Write data to the file
    const encoder = new TextEncoder();
    const data = encoder.encode(testCode);
    await vscode.workspace.fs.writeFile(testFileUri, data);

    // Open and show the file in a new editor
    const document = await vscode.workspace.openTextDocument(testFileUri);
    vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.Beside,
    });
}

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for messages from the Sidebar component and execute action
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "onFetchText": {
                    let editor = vscode.window.activeTextEditor;

                    if (editor === undefined) {
                        vscode.window.showErrorMessage("No active text editor");
                        return;
                    }

                    if (editor.document.languageId !== "solidity") {
                        vscode.window.showErrorMessage(
                            "This is not a Solidity smart contract"
                        );
                        return;
                    }

                    let text = editor.document.getText();
                    switch (data.value.action) {
                        case "auditContract":
                            vscode.window.showInformationMessage(
                                "Auditing Smart Contract..."
                            );
                            break;
                        case "generateTestCode":
                            vscode.window.showInformationMessage(
                                "Generating Test Code..."
                            );
                            break;
                    }

                    // send message back to the sidebar component
                    this._view?.webview.postMessage({
                        type: "onSelectedText",
                        value: text,
                    });
                    break;
                }
                case "onFetchGasUsage": {
                    let gasUsageData = "";

                    if (!vscode.workspace.workspaceFolders) {
                        vscode.window.showErrorMessage(
                            "No workspace folders open"
                        );
                        return;
                    }
                    const workspaceFolder =
                        vscode.workspace.workspaceFolders[0];

                    vscode.window.showInformationMessage(
                        "Checking Gas Fees..."
                    );

                    const testProcess = cp.exec("npx hardhat test", {
                        cwd: workspaceFolder.uri.fsPath,
                    });

                    testProcess.stdout.on("data", (data: String) => {
                        if (
                            data.slice(0, 2) === "·-" ||
                            data.slice(0, 2) === "··" ||
                            data.slice(0, 2) === "| "
                        ) {
                            gasUsageData += data;
                        }
                    });

                    // testProcess.stderr.on("data", (data: String) => {
                    // console.error(`stderr: ${data}`);
                    // });

                    testProcess.on("close", async () => {
                        const data = await estimate(gasUsageData);
                        this._view?.webview.postMessage({
                            type: "onFetchGasUsage",
                            value: data,
                        });
                        console.log(data);
                        vscode.window.showInformationMessage(
                            "Checking Gas Fees Finished!"
                        );
                    });
                    break;
                }
                case "onCheckRequirements": {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders) {
                        vscode.window.showErrorMessage("No workspace is open.");
                        return;
                    }
                    const rootUri = workspaceFolders[0].uri;

                    let rootPath = rootUri.fsPath;

                    if (
                        !fs.existsSync(`${rootPath}/hardhat.config.js`) &&
                        !fs.existsSync(`${rootPath}/hardhat.config.ts`)
                    ) {
                        vscode.window.showErrorMessage(
                            "The active workspace is not a Hardhat project. Move to the root directory of a Hardhat project."
                        );
                        this._view?.webview.postMessage({
                            type: "onCheckRequirements",
                            value: "false",
                        });
                        break;
                    }
                    if (data.value.action === "fetchGasUsage") {
                        let hardhatConfigPath = path.join(
                            rootPath,
                            "hardhat.config.js"
                        );
                        if (
                            fs.existsSync(
                                path.join(rootPath, "hardhat.config.ts")
                            )
                        ) {
                            hardhatConfigPath = path.join(
                                rootPath,
                                "hardhat.config.ts"
                            );
                        }
                        let hardhatConfigContent = fs.readFileSync(
                            hardhatConfigPath,
                            "utf8"
                        );

                        if (!hardhatConfigContent.includes("gasReporter")) {
                            console.log("22");
                            vscode.window.showErrorMessage(
                                "gasReporter is not found in the Hardhat config file"
                            );
                            this._view?.webview.postMessage({
                                type: "onCheckRequirements",
                                value: "false",
                            });
                            break;
                        }
                    }

                    this._view?.webview.postMessage({
                        type: "onCheckRequirements",
                        value: "true",
                    });

                    break;
                }
                case "onTestCode": {
                    const generatedTestCode = data.value.testCode;
                    try {
                        console.log(generatedTestCode);
                        await createTestFile(generatedTestCode);
                    } catch (e) {}
                    break;
                }
                case "onRewriteCode": {
                    const editor = vscode.window.activeTextEditor;
                    if (editor === undefined) {
                        vscode.window.showErrorMessage("No active text editor");
                        return;
                    }
                    const originalText = data.value.originalCode;
                    const generatedText = data.value.rewrittenCode;
                    const regex = /```solidity\n([\s\S]*?)\n```/;
                    const match = regex.exec(generatedText);

                    if (match) {
                        // Open a new editor pane for the generated text
                        const originalDoc =
                            vscode.window.activeTextEditor?.document;

                        if (!originalDoc) {
                            vscode.window.showErrorMessage(
                                "No document is open"
                            );
                            return;
                        }

                        const aiModifiedCode = match[1];

                        try {
                            const tempFilePath = `${originalDoc.fileName}.ai-modified`;
                            fs.writeFileSync(tempFilePath, aiModifiedCode);

                            const tempFileUri = vscode.Uri.file(tempFilePath);

                            const languageId = originalDoc.languageId;
                            const tempDoc =
                                await vscode.workspace.openTextDocument(
                                    tempFileUri
                                );
                            const tempEditor =
                                await vscode.window.showTextDocument(tempDoc);
                            await vscode.languages.setTextDocumentLanguage(
                                tempDoc,
                                languageId
                            );

                            await vscode.commands.executeCommand(
                                "vscode.diff",
                                originalDoc.uri,
                                tempFileUri,
                                "Original ↔ AI-Modified"
                            );
                            fs.unlinkSync(tempFilePath);
                            tempEditor.hide();
                        } catch (err) {
                            console.error("Error executing diff command:", err);
                        }
                    }
                }
                // case "onTest": {
                // console.log(estimate());
                //     break;
                // }
                case "onInfo": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case "onError": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
        );
        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this._extensionUri,
                "out",
                "compiled/sidebar.js"
            )
        );
        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this._extensionUri,
                "out",
                "compiled/sidebar.css"
            )
        );

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">
                <script nonce="${nonce}">
                    const tsvscode = acquireVsCodeApi();
                </script>

			</head>
            <body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
