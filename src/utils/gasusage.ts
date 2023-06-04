export async function estimate(gasData: String) {
    type GasDetails = {
        gas: number;
        usd: number;
    };

    type ContractData = {
        methods: Record<string, GasDetails>;
        deployment: GasDetails | null;
    };
    const data = gasData;

    // Get the lines of the string
    let lines = data.split("\n");

    // Define regular expressions to match the lines of interest
    const methodLineRegex =
        /^\|\s+([^\·]+)\s+·\s+([^\·]+)\s+·\s+(?:-|\d+)\s+·\s+(?:-|\d+)\s+·\s+(\d+)\s+·\s+(?:\d+)\s+·\s+(\d+\.\d+)\s+│$/;
    const deploymentLineRegex =
        /^\|\s+([^\·]+)\s+·\s+(?:-)\s+·\s+(?:-)\s+·\s+(\d+)\s+·\s+(?:\d+\.\d+ %)\s+·\s+(\d+\.\d+)\s+│$/;

    // Define a container for the extracted values
    const contractData: Record<string, ContractData> = {};

    // Loop through the lines
    for (let line of lines) {
        // Trim leading and trailing spaces
        line = line.trim();

        // Check if the line matches the method line regular expression
        const methodMatch = line.match(methodLineRegex);
        if (methodMatch) {
            const contract = methodMatch[1].trim();
            const method = methodMatch[2].trim();
            const avgGas = parseInt(methodMatch[3]);
            const avgUSD = parseFloat(methodMatch[4]);

            // Initialize the contract data if it doesn't exist yet
            if (!contractData[contract]) {
                contractData[contract] = { methods: {}, deployment: null };
            }

            // Add the method data
            contractData[contract].methods[method] = {
                gas: avgGas,
                usd: avgUSD,
            };
        }

        // Check if the line matches the deployment line regular expression
        const deploymentMatch = line.match(deploymentLineRegex);
        if (deploymentMatch) {
            const contract = deploymentMatch[1].trim();
            const avgGas = parseInt(deploymentMatch[2]);
            const avgUSD = parseFloat(deploymentMatch[3]);

            // Initialize the contract data if it doesn't exist yet
            if (!contractData[contract]) {
                contractData[contract] = { methods: {}, deployment: null };
            }

            // Add the deployment data
            contractData[contract].deployment = { gas: avgGas, usd: avgUSD };
        }
    }

    return contractData;
}
