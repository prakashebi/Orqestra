import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.event import AuditEvent
from app.models.user import User, UserRole
from app.schemas.event import AuditEventListResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.get(
    "",
    response_model=AuditEventListResponse,
    dependencies=[Depends(require_role(UserRole.admin, UserRole.member))],
)
async def list_events(
    event_type: str | None = Query(None),
    entity_id: uuid.UUID | None = Query(None),
    actor_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditEvent).order_by(AuditEvent.created_at.desc())
    if event_type:
        stmt = stmt.where(AuditEvent.event_type == event_type)
    if entity_id:
        stmt = stmt.where(AuditEvent.entity_id == entity_id)
    if actor_id:
        stmt = stmt.where(AuditEvent.actor_id == actor_id)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = (await db.scalars(stmt.offset(skip).limit(limit))).all()
    return AuditEventListResponse(total=total or 0, items=list(rows))
