from typing import TypedDict

from fastapi import FastAPI
from langgraph.graph import END, START, StateGraph


class AgentState(TypedDict, total=False):
    request_id: str
    user_goal: str
    evidence: list[str]
    proposed_action: dict
    status: str


def retrieve(state: AgentState) -> AgentState:
    # Replace with Qdrant hybrid retrieval; always attach source ids and tenant filters.
    return {"evidence": [], "status": "retrieved"}


def propose(state: AgentState) -> AgentState:
    # Replace with a provider adapter. The model proposes; policy code decides.
    return {"proposed_action": {"type": "read_only", "goal": state["user_goal"]}, "status": "proposed"}


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("retrieve", retrieve)
    graph.add_node("propose", propose)
    graph.add_edge(START, "retrieve")
    graph.add_edge("retrieve", "propose")
    graph.add_edge("propose", END)
    return graph.compile()


app = FastAPI(title="Agent Capstone")
agent = build_graph()


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/runs")
def create_run(goal: str):
    result = agent.invoke({"request_id": "local", "user_goal": goal})
    return {"status": result["status"], "proposal": result["proposed_action"]}
