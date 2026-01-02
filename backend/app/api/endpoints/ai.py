from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from app.services.ai_service import ai_service

router = APIRouter()

class RefineRequest(BaseModel):
    code: str
    instruction: str
    model: str = None

@router.get("/models")
async def list_models():
    return await ai_service.list_models()

@router.post("/refine")
async def refine_code(request: RefineRequest):
    return StreamingResponse(
        ai_service.refine_code(request.code, request.instruction, request.model),
        media_type="text/event-stream"
    )

class ChatRequest(BaseModel):
    messages: list
    model: str = None

@router.post("/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        ai_service.chat(request.messages, request.model),
        media_type="text/event-stream"
    )
