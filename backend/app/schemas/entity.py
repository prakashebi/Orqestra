import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.entity import EntityStatus


class EntityCreate(BaseModel):
    entity_type: str
    title: str
    description: str | None = None
    status: EntityStatus = EntityStatus.active
    metadata_: dict | None = None


class EntityRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    entity_type: str
    title: str
    description: str | None
    status: EntityStatus
    metadata_: dict | None
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class EntityUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: EntityStatus | None = None
    metadata_: dict | None = None


class EntityListResponse(BaseModel):
    total: int
    items: list[EntityRead]
