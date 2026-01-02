from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.database import get_session
from app.models.secret import Secret
from app.services.secret_service import secret_service
from app.core.security import decrypt_value
from pydantic import BaseModel

router = APIRouter()

class SecretCreate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SecretRead(BaseModel):
    id: int
    key: str
    last_4_chars: str # Only show last 4 chars for security
    description: Optional[str] = None

@router.get("/", response_model=List[SecretRead])
def list_secrets(session: Session = Depends(get_session)):
    secrets = secret_service.list_secrets(session)
    results = []
    for s in secrets:
        decrypted = decrypt_value(s.value)
        results.append(
            SecretRead(
                id=s.id,
                key=s.key,
                last_4_chars=decrypted[-4:] if len(decrypted) > 4 else decrypted,
                description=s.description
            )
        )
    return results

@router.post("/", response_model=Secret)
def create_secret(secret_in: SecretCreate, session: Session = Depends(get_session)):
    try:
        return secret_service.create_secret(session, secret_in.key, secret_in.value, secret_in.description)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{secret_id}")
def delete_secret(secret_id: int, session: Session = Depends(get_session)):
    success = secret_service.delete_secret(session, secret_id)
    if not success:
        raise HTTPException(status_code=404, detail="Secret not found")
    return {"ok": True}
