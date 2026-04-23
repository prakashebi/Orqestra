from flask import Flask

from app.api.v1 import auth, entities, events, members, users


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(auth.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(entities.bp)
    app.register_blueprint(events.bp)
    app.register_blueprint(members.bp)
