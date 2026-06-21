import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from sqlalchemy import select
from werkzeug.utils import secure_filename

from app.api.deps import check_entity_permission, get_current_user, require_write_access
from app.core.config import get_settings
from app.extensions import db
from app.models.entity import Entity
from app.schemas.entity import EntityRead

bp = Blueprint("attachments", __name__)

ALLOWED_EXTENSIONS = {
    "pdf", "png", "jpg", "jpeg", "gif", "webp",
    "txt", "md", "csv",
    "doc", "docx", "xls", "xlsx",
    "zip", "tar", "gz",
}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _entity_or_404(entity_id: str):
    entity = db.session.scalar(
        select(Entity).where(Entity.id == uuid.UUID(entity_id), Entity.is_deleted.is_(False))
    )
    if not entity:
        return None, (jsonify(detail="Entity not found"), 404)
    return entity, None


@bp.post("/api/v1/entities/<entity_id>/attachments")
@jwt_required()
def upload_attachment(entity_id: str):
    current_user = get_current_user()
    require_write_access(current_user)

    entity, err = _entity_or_404(entity_id)
    if err:
        return err

    check_entity_permission(entity, current_user)

    if "file" not in request.files:
        return jsonify(detail="No file provided"), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify(detail="No filename"), 400

    if not _allowed(file.filename):
        return jsonify(detail="File type not allowed"), 400

    settings = get_settings()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > max_bytes:
        return jsonify(detail=f"File exceeds {settings.max_upload_size_mb}MB limit"), 400

    attachment_id = str(uuid.uuid4())
    safe_name = secure_filename(file.filename)
    stored_name = f"{attachment_id}_{safe_name}"

    entity_dir = Path(settings.upload_folder) / entity_id
    entity_dir.mkdir(parents=True, exist_ok=True)
    file.save(entity_dir / stored_name)

    metadata = dict(entity.metadata_ or {})
    attachments = list(metadata.get("attachments", []))
    attachments.append({
        "id": attachment_id,
        "name": safe_name,
        "size": size,
        "type": file.content_type or "application/octet-stream",
        "stored_name": stored_name,
        "uploaded_by": current_user.username,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    })
    metadata["attachments"] = attachments
    entity.metadata_ = metadata
    db.session.commit()
    db.session.refresh(entity)

    return jsonify(EntityRead.model_validate(entity).model_dump(mode="json", by_alias=True)), 201


@bp.get("/api/v1/attachments/<entity_id>/<attachment_id>")
@jwt_required()
def download_attachment(entity_id: str, attachment_id: str):
    current_user = get_current_user()

    entity, err = _entity_or_404(entity_id)
    if err:
        return err

    check_entity_permission(entity, current_user)

    metadata = entity.metadata_ or {}
    attachment = next((a for a in metadata.get("attachments", []) if a["id"] == attachment_id), None)
    if not attachment:
        return jsonify(detail="Attachment not found"), 404

    settings = get_settings()
    file_path = Path(settings.upload_folder) / entity_id / attachment["stored_name"]
    if not file_path.exists():
        return jsonify(detail="File not found on server"), 404

    return send_file(file_path.resolve(), as_attachment=True, download_name=attachment["name"])


@bp.delete("/api/v1/entities/<entity_id>/attachments/<attachment_id>")
@jwt_required()
def delete_attachment(entity_id: str, attachment_id: str):
    current_user = get_current_user()
    require_write_access(current_user)

    entity, err = _entity_or_404(entity_id)
    if err:
        return err

    check_entity_permission(entity, current_user)

    metadata = dict(entity.metadata_ or {})
    attachments = list(metadata.get("attachments", []))
    attachment = next((a for a in attachments if a["id"] == attachment_id), None)
    if not attachment:
        return jsonify(detail="Attachment not found"), 404

    settings = get_settings()
    file_path = Path(settings.upload_folder) / entity_id / attachment["stored_name"]
    if file_path.exists():
        file_path.unlink()

    metadata["attachments"] = [a for a in attachments if a["id"] != attachment_id]
    entity.metadata_ = metadata
    db.session.commit()
    db.session.refresh(entity)

    return jsonify(EntityRead.model_validate(entity).model_dump(mode="json", by_alias=True))
