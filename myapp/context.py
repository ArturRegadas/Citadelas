from flask import session, Flask, url_for
from werkzeug.routing.exceptions import BuildError
from typing import Dict, Optional, Any
def init_context(app: Flask) -> None:

    @app.context_processor
    def inject_url_helpers() -> Dict[str, Any]:
        def safe_url_for(endpoint: str, fallback: str = "/", **values) -> str:
            """url_for que não quebra o template quando o endpoint não existe.

            Útil em componentes legados (ex.: Header.html) incluídos por
            páginas de erro: evita que um 404 vire 500 por BuildError.
            """
            try:
                return url_for(endpoint, **values)
            except BuildError:
                return fallback

        return dict(safe_url_for=safe_url_for)

    @app.context_processor
    def inject_user() -> Dict[str, Optional[Dict[str, Any]]]:
        search_links = []#_cached_search_links()

        user_id = session.get("user_id")
        if not user_id:
            return dict(user=None)

        user_name = session.get("username")
        user_wallet = session.get("user_wallet")
        user_photo = session.get("user_photo", "#")
        user_complete_name = session.get("user_name")
        

        user_context = {
            "id": user_id,
            "photo": user_photo,
            "name": user_name,
            "complete_name": user_complete_name,
            "wallet": user_wallet
        }

        return dict(user=user_context)
