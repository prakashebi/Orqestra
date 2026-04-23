import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from pydantic import ValidationError
from sqlalchemy import select

from app.api.deps import check_entity_permission, get_current_user
from app.extensions import db
from app.models.entity import Entity
from app.models.membership import Membership, MemberRole
from app.models.user import User, UserRole
from app.schemas.membership import MemberInvite, MemberRead, MemberRoleUpdate

bp = Blueprint("members", __name__, url_prefix="/api/v1/entities")


@bp.get("/<entity_id>/members")
@jwt_required()
def list_members(entity_id: str):
    current_user = get_current_user()
    entity = _get_entity_or_404(entity_id)
    check_entity_permission(entity, current_user)

    memberships = db.session.scalars(
        select(Membership).where(Membership.entity_id == entity.id)
    ).all()
    return jsonify([MemberRead.from_membership(m).model_dump(mode="json") for m in memberships])


@bp.post("/<entity_id>/members")
@jwt_required()
def invite_member(entity_id: str):
    current_user = get_current_user()
    entity = _get_entity_or_404(entity_id)
    # Only owner or admin can invite
    check_entity_permission(entity, current_user, require_owner_or_admin=True)

    try:
        payload = MemberInvite.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify(detail=e.errors()), 422

    target_user = db.session.scalar(select(User).where(User.email == payload.email))
    if not target_user:
        return jsonify(detail="No user found with that email address"), 404

    if target_user.id == entity.owner_id:
        return jsonify(detail="Cannot invite the entity owner as a member"), 409

    existing = db.session.scalar(
        select(Membership).where(
            Membership.entity_id == entity.id,
            Membership.user_id == target_user.id,
        )
    )
    if existing:
        return jsonify(detail="User is already a member"), 409

    membership = Membership(
        entity_id=entity.id,
        user_id=target_user.id,
        role=payload.role,
        invited_by=current_user.id,
    )
    db.session.add(membership)
    db.session.commit()
    db.session.refresh(membership)
    return jsonify(MemberRead.from_membership(membership).model_dump(mode="json")), 201


@bp.patch("/<entity_id>/members/<member_user_id>")
@jwt_required()
def update_member_role(entity_id: str, member_user_id: str):
    current_user = get_current_user()
    entity = _get_entity_or_404(entity_id)
    check_entity_permission(entity, current_user, require_owner_or_admin=True)

    try:
        payload = MemberRoleUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify(detail=e.errors()), 422

    membership = _get_membership_or_404(entity.id, uuid.UUID(member_user_id))
    membership.role = payload.role
    db.session.commit()
    db.session.refresh(membership)
    return jsonify(MemberRead.from_membership(membership).model_dump(mode="json"))


@bp.delete("/<entity_id>/members/<member_user_id>")
@jwt_required()
def remove_member(entity_id: str, member_user_id: str):
    current_user = get_current_user()
    entity = _get_entity_or_404(entity_id)

    target_uid = uuid.UUID(member_user_id)

    # Allow self-removal or owner/admin removal
    if current_user.id != target_uid:
        check_entity_permission(entity, current_user, require_owner_or_admin=True)

    membership = _get_membership_or_404(entity.id, target_uid)
    db.session.delete(membership)
    db.session.commit()
    return "", 204


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_entity_or_404(entity_id: str) -> Entity:
    entity = db.session.scalar(
        select(Entity).where(Entity.id == uuid.UUID(entity_id), Entity.is_deleted.is_(False))
    )
    if not entity:
        from flask import abort
        abort(404, description="Entity not found")
    return entity


def _get_membership_or_404(entity_id: uuid.UUID, user_id: uuid.UUID) -> Membership:
    membership = db.session.scalar(
        select(Membership).where(
            Membership.entity_id == entity_id,
            Membership.user_id == user_id,
        )
    )
    if not membership:
        from flask import abort
        abort(404, description="Member not found")
    return membership
