import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class EntityStatus(str, enum.Enum):
    active = "active"
    in_progress = "in_progress"
    completed = "completed"
    archived = "archived"


class Entity(UUIDMixin, TimestampMixin, Base):
    """Generic extensible entity — can represent tasks, workflows, experiments, etc."""

    __tablename__ = "entities"

    entity_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[EntityStatus] = mapped_column(
        Enum(EntityStatus, name="entity_status"),
        default=EntityStatus.active,
        nullable=False,
        index=True,
    )
    # Extensible metadata — arbitrary key/value pairs per entity type
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True, default=dict)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Soft-delete support for auditability
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
