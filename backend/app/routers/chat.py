"""
routers/chat.py
---------------
v1.5.0 — Chat with your data endpoint.

POST /api/v1/chat
  Request:  { "message": "How much did I spend this month?" }
  Response: ChatResponse with answer text, chart_type, chart_data, quick_replies
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.schemas import ChatMessage, ChatResponse
from app.services.chat_service import process_chat

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def chat(payload: ChatMessage, session: Session = Depends(get_session)):
    """
    v1.5.0 — Natural language query against the user's expense data.
    Uses keyword-based NLP — no external AI API required.
    """
    result = process_chat(session, payload.message)
    return ChatResponse(**result)
