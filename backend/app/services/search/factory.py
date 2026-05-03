from app.core.config import get_settings

from .base import SearchService


def get_search_service() -> SearchService:
    settings = get_settings()

    if settings.search_backend == "opensearch":
        from .opensearch_service import OpenSearchService
        return OpenSearchService(
            host=settings.opensearch_host,
            port=settings.opensearch_port,
            user=settings.opensearch_user,
            password=settings.opensearch_password,
        )

    from .postgres import PostgresSearchService
    return PostgresSearchService()
