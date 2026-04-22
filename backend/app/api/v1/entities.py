import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entity import Entity, EntityStatus
from app.models.event import AuditEvent
from app.models.user import User
from app.schemas.entity import EntityCreate, EntityListResponse, EntityRead, EntityUpdate

router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("", response_model=EntityListResponse)
async def list_entities(
    entity_type: str | None = Query(None),
    status: EntityStatus | None = Query(None),
    q: str | None = Query(None, description="Full-text filter on title"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Entity).where(Entity.is_deleted.is_(False))
    if entity_type:
        stmt = stmt.where(Entity.entity_type == entity_type)
    if status:
        stmt = stmt.where(Entity.status == status)
    if q:
        stmt = stmt.where(Entity.title.ilike(f"%{q}%"))

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = (await db.scalars(stmt.offset(skip).limit(limit))).all()
    return EntityListResponse(total=total or 0, items=list(rows))


@router.post("", response_model=EntityRead, status_code=201)
async def create_entity(
    payload: EntityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entity = Entity(
        entity_type=payload.entity_type,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        metadata_=payload.metadata_,
        owner_id=current_user.id,
    )
    db.add(entity)

    event = AuditEvent(
        event_type="entity.created",
        actor_id=current_user.id,
        entity_type=payload.entity_type,
        payload={"title": payload.title},
    )
    db.add(event)

    await db.commit()
    await db.refresh(entity)
    return entity


@router.get("/{entity_id}", response_model=EntityRead)
async def get_entity(
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    entity = await db.scalar(select(Entity).where(Entity.id == entity_id, Entity.is_deleted.is_(False)))
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.patch("/{entity_id}", response_model=EntityRead)
async def update_entity(
    entity_id: uuid.UUID,
    payload: EntityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entity = await db.scalar(select(Entity).where(Entity.id == entity_id, Entity.is_deleted.is_(False)))
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    updated_fields: dict = {}
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(entity, field, value)
        updated_fields[field] = value

    event = AuditEvent(
        event_type="entity.updated",
        actor_id=current_user.id,
        entity_id=entity_id,
        entity_type=entity.entity_type,
        payload=updated_fields,
    )
    db.add(event)

    await db.commit()
    await db.refresh(entity)
    return entity


@router.delete("/{entity_id}", status_code=204)
async def delete_entity(
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entity = await db.scalar(select(Entity).where(Entity.id == entity_id, Entity.is_deleted.is_(False)))
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    entity.is_deleted = True

    event = AuditEvent(
        event_type="entity.deleted",
        actor_id=current_user.id,
        entity_id=entity_id,
        entity_type=entity.entity_type,
        payload={"title": entity.title},
    )
    db.add(event)
    await db.commit()
