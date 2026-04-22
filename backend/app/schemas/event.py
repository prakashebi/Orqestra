import uuid
from datetime import datetime

from pydantic import BaseModel


class AuditEventRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    event_type: str
    actor_id: uuid.UUID | None
    entity_id: uuid.UUID | None
    entity_type: str | None
    payload: dict | None
    created_at: datetime


class AuditEventListResponse(BaseModel):
    total: int
    items: list[AuditEventRead]
