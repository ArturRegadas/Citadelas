
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict

from pydantic import BaseModel

from myapp.services.GeminiService import article_importance
from myapp.services.OpenAlex import AlexService


GERAL_WEIGHTS = {
    "similarity": 0.40,
    "importance": 0.50,
    "relevance": 0.10,
    "genre_compose": 0.10,
    "present": 0.05,
}

MAX_GEMINI_WORKERS = 4

alexService = AlexService()

def expand_score(score: float, factor = 0.4) -> float:
    """Expand medium/high similarity scores while keeping them in [0, 100]."""
    normalized_score = max(0.0, min(100.0, float(score))) / 100.0
    return (normalized_score ** factor) * 100.0


def normalize_text(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, (list, tuple, set)):
        return " ".join(
            str(item) for item in value if item is not None
        )

    return str(value).strip()


def convert_to_text(article: Dict[str, Any]) -> str:
    title = article.get("title") or ""
    keywords = article.get("keywords") or []
    abstract = article.get("abstract") or ""

    return (
        f"Título: {title}\n"
        f"Palavras-chave: {normalize_text(keywords)}\n"
        f"Resumo: {abstract}\n"
    )


def calculate_article_importance(
    article_a_text: str,
    article_b: Dict[str, Any],
):
    """
    Obtém similaridade e importância na mesma consulta ao Gemini.
    """
    return article_importance(
        article_a_text,
        convert_to_text(article_b),
    )


def calculate_article_present(
    article_b: Dict[str, Any],
    h: int = 10,
) -> float:
    publication_year = article_b.get("year") or article_b.get("ano")

    if not publication_year or h <= 0:
        return 0.0

    age = max(
        0,
        datetime.date.today().year - int(publication_year),
    )

    return 100.0 * (2 ** (-age / h))


def calculate_article_relevance(
    article_b: Dict[str, Any],
    base: float = 10,
) -> float:
    citations = article_b.get("cited_by_count") or 0

    if base <= 0:
        return 100.0

    return max(
        0.0,
        min(100.0, (citations / base) * 100.0),
    )


def calculate_article_genre_compose(
    article_b: Dict[str, Any],
) -> float:
    value = (
        (article_b.get("genero") or {}).get("female_percentage", 0)
        or 0
    )

    return float(value)


def _importance_result(
    article_a_text: str,
    article_b: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Faz uma única consulta ao Gemini e retorna seus resultados,
    incluindo similarity e importance_score.
    """
    try:
        result = calculate_article_importance(
            article_a_text,
            article_b,
        )

        if isinstance(result, BaseModel):
            result = result.model_dump(mode="json")

        if not isinstance(result, dict):
            return {
                "erro": "O Gemini não retornou um resultado válido."
            }

        return result

    except Exception as error:
        return {"erro": str(error)[:200]}


def _compose_score(
    article_b: Dict[str, Any],
    importance_result_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calcula a pontuação final usando a similaridade e a importância
    retornadas pela mesma consulta ao Gemini.
    """
    similarity_value = float(
        importance_result_data.get("similarity", 0) or 0
    )

    importance_value = (
        importance_result_data.get("importance_score", 0)
        or importance_result_data.get("score", 0)
        or 0
    )
    # Mantém os valores dentro do intervalo esperado.
    similarity_value
    importance_value

    present_result = calculate_article_present(article_b, h=5)
    relevance_result = calculate_article_relevance(
        article_b,
        base=15,
    )
    genre_compose_result = calculate_article_genre_compose(
        article_b
    )

    total = (
        similarity_value * GERAL_WEIGHTS["similarity"]
        + importance_value * GERAL_WEIGHTS["importance"]
        + present_result * GERAL_WEIGHTS["present"]
        + relevance_result * GERAL_WEIGHTS["relevance"]
        + genre_compose_result * GERAL_WEIGHTS["genre_compose"]
    )

    return {
        "similarity": expand_score(similarity_value,  0.6),
        "importance": expand_score(importance_value, 0.6),
        "present": present_result,
        "relevance": relevance_result,
        "genre_compose": genre_compose_result,
        "total": total,
        "correction": importance_result_data,
    }


def calculate_score(
    article_a_text: str,
    article_a_data: Dict[str, Any],
    article_b: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calcula a pontuação de um candidato com uma única consulta
    ao Gemini para obter similaridade e importância.
    """
    importance_data = _importance_result(
        article_a_text,
        article_b,
    )

    return _compose_score(article_b, importance_data)


def calculate_articles_scores(
    article_a: Dict[str, Any],
    limit: int = 5,
    offset: int = 0,
):
    article_a_text = article_a.get("all_content", "")
    article_a_data = article_a.get("article_analysis", {})

    if isinstance(article_a_data, BaseModel):
        article_a_data = article_a_data.model_dump()

    articles_response = alexService.buscar_artigos_para_comparacao(
        entrada=article_a_data,
        limite_percentual=25,
        country_id="BR",
        fallback_qtd=limit + offset,
    )

    candidates = (
        (articles_response or {}).get("candidatos", []) or []
    )
    candidates = candidates[offset:offset + limit]

    if not candidates:
        return []

    # Uma consulta ao Gemini por candidato, executada concorrentemente.
    importance_results = [None] * len(candidates)

    with ThreadPoolExecutor(
        max_workers=MAX_GEMINI_WORKERS
    ) as executor:
        future_to_index = {
            executor.submit(
                _importance_result,
                article_a_text,
                candidate,
            ): index
            for index, candidate in enumerate(candidates)
        }

        for future in as_completed(future_to_index):
            index = future_to_index[future]

            try:
                importance_results[index] = future.result()
            except Exception as error:
                importance_results[index] = {
                    "erro": str(error)[:200]
                }

    results = []

    for candidate, importance_data in zip(
        candidates,
        importance_results,
    ):
        score_data = _compose_score(
            candidate,
            importance_data or {},
        )

        results.append({
            "article": {
                "article_data": candidate,
                "score_data": score_data,
            }
        })

    return results


if __name__ == "__main__":
    article_a_text = (
        "Título: Inteligência artificial na medicina\n"
        "Resumo: Estudo sobre o uso de IA no diagnóstico de doenças.\n"
    )

    article_a_data = {
        "title": "Inteligência artificial na medicina",
        "summary": "Estudo sobre o uso de IA no diagnóstico de doenças.",
        "topics": [
            {
                "key_words": [
                    "inteligência artificial",
                    "medicina",
                    "diagnóstico",
                ]
            }
        ],
    }

    article_b = {
        "title": "Aprendizado de máquina no diagnóstico médico",
        "abstract": "Pesquisa sobre modelos de IA para detectar doenças.",
        "keywords": ["IA", "medicina", "diagnóstico"],
        "year": 2025,
        "cited_by_count": 50,
        "genero": {"female_percentage": 60},
    }

    result = calculate_score(
        article_a_text,
        article_a_data,
        article_b,
    )

    print(result)
