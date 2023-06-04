from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.text_splitter import CharacterTextSplitter
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA
from dotenv import load_dotenv
import openai
import os
from langchain.agents import Tool
from langchain.document_loaders import WebBaseLoader
from langchain.agents import Tool, AgentExecutor, LLMSingleActionAgent, AgentOutputParser
from langchain.prompts import StringPromptTemplate
from langchain import LLMChain
from typing import List, Union
from langchain.schema import AgentAction, AgentFinish
from langchain.prompts import PromptTemplate
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from fastapi.responses import JSONResponse
import tempfile
import re

app = FastAPI()

load_dotenv()
openai_api_key = os.environ.get("OPENAI_API_KEY")

@app.get("/")
async def root():
    return {"message": "Hello World"}

# Enable CORS for all origins (you may want to restrict this to specific domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/website")
async def user_input(data: dict):
    # GPT-4
    # llm = ChatOpenAI(model_name="gpt-4", verbose=True, temperature=0)
    # prompt = PromptTemplate(
    #     input_variables=["code"],
    #     template="Perform smart contract auditing for this code: {code}, and return results as a list. Be concise. For each list, provide code solutions to the errors. Provide the final full updated code.",
    # )

    # GPT-3.5
    llm = ChatOpenAI(model_name="gpt-4", verbose=True, temperature=0)
    prompt = PromptTemplate(
        input_variables=["code"],
        template="Perform smart contract auditing for this code: {code}, and return results as a list. Be concise. For each list, provide code solutions to the errors. Provide the final full updated code. In the full updated code, for each changed code, make sure to provide comments in the form of '//' to why the code changed. Before the code add this string: ```solidity.",
    )
    chain = LLMChain(llm=llm, prompt=prompt)
    print("Code is: ",data['code'])
    result = chain.run(data['code'])

    return result

@app.post("/testcode")
async def user_input(data: dict):
    # llm = ChatOpenAI(model_name="gpt-4", verbose=True, temperature=0)
    llm = ChatOpenAI(verbose=True, temperature=0)
    prompt = PromptTemplate(
        input_variables=["code"],
        template="Create a basic yet comprehensive test code for the following solidity smart contract. You should use the libraries: chai and hardhat. Only show me the code: {code}",
    )
    chain = LLMChain(llm=llm, prompt=prompt)
    print("Code is: ",data['code'])
    result = chain.run(data['code'])

    return result
