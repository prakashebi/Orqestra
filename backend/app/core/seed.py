from sqlalchemy import select

from app.core.security import hash_password
from app.extensions import db
from app.models.user import User, UserRole

_ADMIN_EMAIL = "admin@orqestra.local"
_ADMIN_USERNAME = "admin"
_ADMIN_PASSWORD = "admin"


def seed_default_admin() -> None:
    """Create a default superuser admin if no users exist yet."""
    if db.session.scalar(select(User)):
        return  # DB already has users — skip

    admin = User(
        email=_ADMIN_EMAIL,
        username=_ADMIN_USERNAME,
        hashed_password=hash_password(_ADMIN_PASSWORD),
        role=UserRole.admin,
        is_active=True,
    )
    db.session.add(admin)
    db.session.commit()
    print(
        f"[seed] Default admin created — "
        f"email: {_ADMIN_EMAIL}  password: {_ADMIN_PASSWORD}  "
        f"(change this password after first login)"
    )
