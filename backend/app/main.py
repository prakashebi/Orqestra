from datetime import timedelta

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from app.core.config import get_settings
from app.extensions import cors, db, jwt


def create_app() -> Flask:
    settings = get_settings()

    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = settings.database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = settings.secret_key
    app.config["JWT_ALGORITHM"] = settings.algorithm
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=settings.access_token_expire_minutes)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, origins=settings.cors_origins, supports_credentials=True)

    from app.api.routes import register_blueprints
    register_blueprints(app)

    @app.get("/health")
    def health():
        return jsonify(status="ok", app=settings.app_name, version=settings.app_version)

    # Return JSON for all HTTP errors instead of Flask's default HTML
    @app.errorhandler(HTTPException)
    def handle_http_error(e: HTTPException):
        return jsonify(detail=e.description), e.code

    # Catch unhandled exceptions and return JSON so errors are visible in the client
    @app.errorhandler(Exception)
    def handle_unexpected_error(e: Exception):
        app.logger.exception("Unhandled exception: %s", e)
        return jsonify(detail=str(e)), 500

    with app.app_context():
        db.create_all()
        from app.core.seed import seed_default_admin
        seed_default_admin()

    return app
