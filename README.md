# smart-contract-auditor README

This is the README for your extension "smart-contract-auditor".

## To Run the Code

### Frontend

Open terminal, and run `npm run watch` first to compile and then press F5 to open up the dev host window for the extension.

### Backend

Uses FastAPI for running python scripts.

```
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd server
uvicorn main:app --reload
```

Also make sure that you create a .env file using `touch .env` that holds your `OPENAI_API_KEY = ` to run the backend files.

## Features

- Smart contract auditing for Solidity and Rust
- Gas optimization
- Creates README file for the codes

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

- `myExtension.enable`: Enable/disable this extension.
- `myExtension.thing`: Set to `blah` to do something.

## Release Notes

### 1.0.0

Initial release of Smart Contract Auditor

## Develop Log

23-05-13

1. Sidebar panel UI and button features
2. Integration with FastAPI python backend
3. Error checking for code 

23-05-14

1. Add Check Gas function to sidebar
2. Apply AI results from sidebar to vscode window
3. Add Test Code Generator to sidebar

23-05-15

1. Split editor and add updated code in virtual window, also highlight green and red for removed and added parts
2. Refine UI/UX for sidebar
3. Create new file for Test Code when it's generated

## TODO

- [x] Error Handling: 1) is solidity 2) has test code 3) hardhat setting(gas reporter)
- [ ] UI update
- [ ] Prompt Engineering: JSON output/parsing, better prompt

