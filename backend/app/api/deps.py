import uuid
from functools import wraps

from flask import abort, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy import select

from app.extensions import db
from app.models.user import User, UserRole


def get_current_user() -> User:
    """Resolve the JWT identity to a User row. Call inside a @jwt_required() route."""
    user_id = get_jwt_identity()
    return db.session.get(User, uuid.UUID(user_id))


def roles_required(*roles: UserRole):
    """Decorator: enforce JWT auth + role membership."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            if not user or not user.is_active:
                return jsonify(detail="User not found"), 401
            if user.role not in roles:
                return jsonify(detail="Insufficient permissions"), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def check_entity_access(entity_owner_id: uuid.UUID | None, current_user: User) -> None:
    """Abort 403 if a non-admin user does not own the entity."""
    if current_user.role == UserRole.admin:
        return
    if entity_owner_id != current_user.id:
        abort(403, description="Access denied: you do not own this resource")


def check_entity_permission(entity, current_user: User, require_owner_or_admin: bool = False) -> None:
    """Abort 403 if user has no access to the entity.

    Admins pass unconditionally. Owners always pass. Members pass unless
    require_owner_or_admin=True (used for invite/remove operations).
    """
    from app.models.membership import Membership  # avoid circular import

    if current_user.role == UserRole.admin:
        return

    if entity.owner_id == current_user.id:
        return

    if require_owner_or_admin:
        abort(403, description="Only the entity owner or an admin can perform this action")

    membership = db.session.scalar(
        select(Membership).where(
            Membership.entity_id == entity.id,
            Membership.user_id == current_user.id,
        )
    )
    if not membership:
        abort(403, description="Access denied: you are not a member of this entity")


def require_write_access(current_user: User) -> None:
    """Abort 403 if the user has viewer (read-only) role."""
    if current_user.role == UserRole.viewer:
        abort(403, description="Viewers have read-only access")
