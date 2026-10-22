from flask import render_template, Blueprint, Response, request, jsonify
from myapp.services.Article import calculate_articles_scores
from myapp.services.ExtractTextService import extract_file_text
import myapp.services.GeminiService as geminiService

get_pdf_page_bp = Blueprint("getPdfPage", __name__)


@get_pdf_page_bp.route("/pdf/page", methods=["POST"])
def GetPdfPage() -> Response:
    pdf_file = request.files.get("pdf_file")

    if pdf_file is None or pdf_file.filename == "":
        return jsonify({"error": "Nenhum arquivo foi enviado."}), 400

    """
    ArticleContextSchema
    "all_content": tudo escrito
    """

    all_content = extract_file_text(pdf_file.read(), pdf_file.filename)
    article_analysis = geminiService.analyze_article(all_content)

    pdf_data = {
        "all_content": all_content,
        "article_analysis": article_analysis,
    }

    recommendations = calculate_articles_scores(pdf_data)

    # Contexto do manuscrito do usuário (para o cabeçalho da página de resultados)
    analysis = article_analysis
    if hasattr(analysis, "model_dump"):
        analysis = analysis.model_dump(mode="json")
    source = {
        "title": analysis.get("title", "") if isinstance(analysis, dict) else "",
        "research_area": analysis.get("research_area", "") if isinstance(analysis, dict) else "",
        "research_objective": analysis.get("research_objective", "") if isinstance(analysis, dict) else "",
        "summary": analysis.get("summary", "") if isinstance(analysis, dict) else "",
    }

    # O front espera { source, recommendations }.
    return jsonify({"source": source, "recommendations": recommendations})
