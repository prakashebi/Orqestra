import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from pydantic import ValidationError
from sqlalchemy import select

from app.api.deps import get_current_user, roles_required
from app.core.security import hash_password
from app.extensions import db
from app.models.user import User, UserRole
from app.schemas.user import UserRead, UserSelfUpdate, UserUpdate

bp = Blueprint("users", __name__, url_prefix="/api/v1/users")


@bp.get("/me")
@jwt_required()
def get_me():
    user = get_current_user()
    if not user:
        return jsonify(detail="User not found"), 401
    return jsonify(UserRead.model_validate(user).model_dump(mode="json"))


@bp.patch("/me")
@jwt_required()
def update_me():
    """Members can update their own email, username, and password — not their role."""
    current_user = get_current_user()
    if not current_user:
        return jsonify(detail="User not found"), 401

    try:
        payload = UserSelfUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify(detail=e.errors()), 422

    if payload.email is not None:
        current_user.email = payload.email
    if payload.username is not None:
        current_user.username = payload.username
    if payload.password is not None:
        current_user.hashed_password = hash_password(payload.password)

    db.session.commit()
    db.session.refresh(current_user)
    return jsonify(UserRead.model_validate(current_user).model_dump(mode="json"))


@bp.get("")
@roles_required(UserRole.admin)
def list_users():
    """Admin only — list all users."""
    users = db.session.scalars(select(User).order_by(User.created_at)).all()
    return jsonify([UserRead.model_validate(u).model_dump(mode="json") for u in users])


@bp.get("/<user_id>")
@roles_required(UserRole.admin)
def get_user(user_id: str):
    """Admin only — get any user by ID."""
    user = db.session.get(User, uuid.UUID(user_id))
    if not user:
        return jsonify(detail="User not found"), 404
    return jsonify(UserRead.model_validate(user).model_dump(mode="json"))


@bp.patch("/<user_id>")
@roles_required(UserRole.admin)
def update_user(user_id: str):
    """Admin only — update any user including role and active status."""
    try:
        payload = UserUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify(detail=e.errors()), 422

    user = db.session.get(User, uuid.UUID(user_id))
    if not user:
        return jsonify(detail="User not found"), 404

    if payload.email is not None:
        user.email = payload.email
    if payload.username is not None:
        user.username = payload.username
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.session.commit()
    db.session.refresh(user)
    return jsonify(UserRead.model_validate(user).model_dump(mode="json"))
