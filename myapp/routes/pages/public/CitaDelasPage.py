from flask import render_template, Blueprint, Response

cita_delas_page_bp = Blueprint("citaDelasPage", __name__)


@cita_delas_page_bp.route("/")
def CitaDelasPage() -> Response:
    """Página inicial do CitaDelas: envio do artigo e recomendações."""
    return render_template("CitaDelas.html")
