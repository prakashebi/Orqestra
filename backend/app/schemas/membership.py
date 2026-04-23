import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.membership import MemberRole


class MemberInvite(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.viewer


class MemberRoleUpdate(BaseModel):
    role: MemberRole


class MemberRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    entity_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    email: str
    role: MemberRole
    invited_by: uuid.UUID | None
    created_at: datetime

    @classmethod
    def from_membership(cls, m) -> "MemberRead":
        return cls(
            id=m.id,
            entity_id=m.entity_id,
            user_id=m.user_id,
            username=m.user.username,
            email=m.user.email,
            role=m.role,
            invited_by=m.invited_by,
            created_at=m.created_at,
        )
