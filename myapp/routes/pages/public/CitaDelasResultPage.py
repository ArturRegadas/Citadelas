from flask import render_template, Blueprint, Response

cita_delas_result_page_bp = Blueprint("citaDelasResultPage", __name__)


@cita_delas_result_page_bp.route("/citadelas/recomendacoes")
def CitaDelasResultPage() -> Response:
    """Painel de recomendações: lista filtrável, comparação e onde citar."""
    return render_template("CitaDelasResult.html")
