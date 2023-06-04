<script lang="ts">
    // import { onMount } from "svelte";
    let text = "";
    let generatedText = "";
    // let changedCode = "";
    // let gasResult = "";
    let results = "";
    function fetchText() {
        tsvscode.postMessage({ type: "onFetchText", value: "" });
    }
    async function auditContract() {
        tsvscode.postMessage({
            type: "onFetchText",
            value: { action: "auditContract" },
        });
        // Listen for messages from the extension
        async function messageListener(event: any) {
            const message = event.data;
            switch (message.type) {
                case "onSelectedText": {
                    text = message.value;
                    const data = { code: text };
                    const response = await fetch(
                        "http://127.0.0.1:8000/website",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(data),
                        }
                    );
                    const jsonData = await response.json();
                    generatedText = jsonData;
                    console.log("result from server: ", jsonData);
                    const regex = /```solidity\n([\s\S]*?)\n```/;
                    const parts = jsonData.split(regex);

                    if (parts.length > 0) {
                        const extractedCode = parts[0];
                        // do something with the extracted code...
                        results = extractedCode;
                    }
                    // Remove the event listener
                    window.removeEventListener("message", messageListener);
                    
                    tsvscode.postMessage({
                        type: "onRewriteCode",
                        value: { originalCode: text, rewrittenCode: generatedText },
                    });
                    break;
                }
            }
        }

        // Attach the event listener
        window.addEventListener("message", messageListener);
    }
    async function fetchGasUsage() {
        tsvscode.postMessage({
            type: "onCheckRequirements",
            value: { action: "fetchGasUsage" },
        });

        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "onCheckRequirements": {
                    if (message.value === "false") {
                        results = `Please follow the guidelines to generate test code:\n\n    1) The active workspace must be a Hardhat project. Move to the root directory of a Hardhat project.\n\n    2) There must be a test code for the contracts\n\n    3) GasReporter library must be installed: npm install --save-dev hardhat-gas-reporter\n\n    4) GasReporter must be stated in the hardhat.config.js file as following:\n\ngasReporter: {
    enabled: true,
    noColors: true,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
}`;
                    } else {
                        tsvscode.postMessage({
                            type: "onFetchGasUsage",
                            value: "",
                        });
                    }
                    break;
                }
                case "onFetchGasUsage": {
                    const contractData = message.value;
                    if (Object.keys(contractData).length === 0) {
                        results = `Please follow the guidelines to generate test code:\n\n    1) The active workspace must be a Hardhat project. Move to the root directory of a Hardhat project.\n\n    2) There must be a test code for the contracts\n\n    3) GasReporter library must be installed: npm install --save-dev hardhat-gas-reporter\n\n    4) GasReporter must be stated in the hardhat.config.js file as following:\n\ngasReporter: {
    enabled: true,
    noColors: true,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
}`;
                        break;
                    }
                    let output = "";

                    for (const contract in contractData) {
                        output += `Contract: ${contract}\n`;
                        output += "  Methods:\n";
                        for (const method in contractData[contract].methods) {
                            output += `    ${method}: gas = ${contractData[contract].methods[method].gas}, USD = $${contractData[contract].methods[method].usd}\n`;
                        }
                        if (contractData[contract].deployment) {
                            output += `  Deployment: gas = ${contractData[contract].deployment.gas}, USD = $${contractData[contract].deployment.usd}\n`;
                        }
                        output += "\n"; // Add a blank line between contracts
                    }
                    results = output;
                    break;
                }
            }
        });
    }
    async function generateTestCode() {
        tsvscode.postMessage({
            type: "onCheckRequirements",
            value: { action: "generateTestCode" },
        });

        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "onCheckRequirements": {
                    if (message.value === "false") {
                        results = `Please follow the guidelines to generate a test code.\n1) The active workspace is not a Hardhat project. Move to the root directory of a Hardhat project.`;
                    } else {
                        tsvscode.postMessage({
                            type: "onFetchText",
                            value: { action: "generateTestCode" },
                        });
                    }
                    break;
                }
                case "onSelectedText": {
                    text = message.value;
                    const data = { code: text };
                    const response = await fetch(
                        "http://127.0.0.1:8000/testcode",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(data),
                        }
                    );
                    const jsonData = await response.json();
                    console.log("result from server: ", jsonData);
                    results = jsonData;
                    tsvscode.postMessage({
                        type: "onTestCode",
                        value: {
                            testCode: results,
                        },
                    });
                    break;
                }
            }
        });
    }
    function applyChanges() {
        tsvscode.postMessage({
            type: "onRewriteCode",
            value: { originalCode: text, rewrittenCode: generatedText },
        });
    }
</script>

<h2>Solidity Copilot</h2>

<textarea
    rows="25"
    id="text"
    style="resize: vertical;"
    minlength="30"
    bind:value={results}
/>
<button on:click={auditContract}>Audit Smart Contract</button>
<!-- <button on:click={applyChanges}>Apply Changes</button> -->
<button on:click={generateTestCode}>Generate Test Code</button>
<button on:click={fetchGasUsage}>Check Gas Fees</button>

<!-- <button on:click={fetchText}>Create README</button> -->
