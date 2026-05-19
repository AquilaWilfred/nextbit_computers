from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class DeliveryAgent(BaseModel):
    id: int
    name: str
    status: str

agents_db = [{"id": 1, "name": "Agent 1", "status": "available"}]

@router.get("/agents")
async def get_delivery_agents():
    return agents_db

@router.post("/agents")
async def create_delivery_agent(agent: DeliveryAgent):
    agent.id = len(agents_db) + 1
    agents_db.append(agent.dict())
    return agent

@router.put("/agents/{agent_id}")
async def update_delivery_agent(agent_id: int, agent: DeliveryAgent):
    for a in agents_db:
        if a["id"] == agent_id:
            a.update(agent.dict())
            return a
    return {"error": "Agent not found"}

@router.delete("/agents/{agent_id}")
async def delete_delivery_agent(agent_id: int):
    global agents_db
    agents_db = [a for a in agents_db if a["id"] != agent_id]
    return {"message": "Deleted"}