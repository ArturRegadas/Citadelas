import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict

from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from myapp.services.GeminiService import article_importance
from myapp.services.OpenAlex import AlexService


WEIGHTS = {
    "title": 0.20,
    "abstract": 0.45,
    "keywords": 0.35,
}

GERAL_WEIGHTS = {
    "similarity": 0.45,
    "importance": 0.45,
    "relevance": 0.10,
    "genre_compose": 0.10,
    "present": 0.05,
}

SEMANTIC_WEIGHT = 0.80
LEXICAL_WEIGHT = 0.20
MAX_GEMINI_WORKERS = 4

model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
alexService = AlexService()


def expand_score(score: float) -> float:
    """Expand medium/high similarity scores while keeping them in [0, 100]."""
    normalized_score = max(0.0, min(100.0, float(score))) / 100.0
    return (normalized_score ** 0.4) * 100.0


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        return " ".join(str(item) for item in value if item is not None)
    return str(value).strip()


def extract_article_fields(article: Dict[str, Any], is_source: bool = False) -> Dict[str, str]:
    """Normalize source/candidate article fields to the common comparison schema."""
    if is_source:
        keywords = []
        for topic in article.get("topics", []) or []:
            if isinstance(topic, dict):
                keywords.extend(topic.get("key_words", []) or [])
        abstract = article.get("summary", "")
    else:
        keywords = article.get("keywords", []) or []
        abstract = article.get("abstract", "")

    return {
        "title": normalize_text(article.get("title", "")),
        "abstract": normalize_text(abstract),
        "keywords": normalize_text(keywords),
    }


def lexical_similarity(text_a: str, text_b: str) -> float:
    if not text_a.strip() or not text_b.strip():
        return 0.0

    vectorizer = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        ngram_range=(1, 2),
        sublinear_tf=True,
    )
    try:
        vectors = vectorizer.fit_transform([text_a, text_b])
    except ValueError:
        return 0.0

    return float(cosine_similarity(vectors[0:1], vectors[1:2])[0, 0])


def _combine_field_scores(
    source_fields: Dict[str, str],
    candidate_fields: Dict[str, str],
    semantic_scores: Dict[str, float],
) -> Dict[str, Any]:
    field_scores = {}
    weighted_total = 0.0
    total_weight = 0.0

    for field, weight in WEIGHTS.items():
        text_a = source_fields[field]
        text_b = candidate_fields[field]

        if not text_a or not text_b:
            continue

        lexical_score = lexical_similarity(text_a, text_b)
        combined_score = (
            SEMANTIC_WEIGHT * semantic_scores[field]
            + LEXICAL_WEIGHT * lexical_score
        )
        field_scores[field] = round(combined_score * 100, 2)
        weighted_total += combined_score * weight
        total_weight += weight

    raw_score = weighted_total / total_weight * 100 if total_weight else 0.0
    return {
        "similarity": round(expand_score(raw_score), 2),
        "field_scores": field_scores,
    }


def calculate_article_similarity(article_a, article_b) -> Dict[str, Any]:
    """Calculate similarity between one source article and one candidate."""
    source_fields = extract_article_fields(article_a, is_source=True)
    candidate_fields = extract_article_fields(article_b, is_source=False)

    fields_to_compare = [
        field for field in WEIGHTS
        if source_fields[field] and candidate_fields[field]
    ]
    semantic_scores = {}

    if fields_to_compare:
        texts = []
        for field in fields_to_compare:
            texts.extend([source_fields[field], candidate_fields[field]])

        # One model call instead of one model call per field.
        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        for index, field in enumerate(fields_to_compare):
            score = float(embeddings[index * 2] @ embeddings[index * 2 + 1])
            semantic_scores[field] = max(0.0, min(1.0, score))

    return _combine_field_scores(source_fields, candidate_fields, semantic_scores)


def calculate_article_similarities(article_a, candidates) -> list:
    """
    Batch version: encodes source and candidate fields in one model call.
    Returns one similarity result per candidate, preserving candidate order.
    """
    source_fields = extract_article_fields(article_a, is_source=True)
    candidate_fields_list = [
        extract_article_fields(candidate, is_source=False)
        for candidate in candidates
    ]

    pairs = []
    texts = []
    for candidate_index, candidate_fields in enumerate(candidate_fields_list):
        for field in WEIGHTS:
            text_a = source_fields[field]
            text_b = candidate_fields[field]
            if text_a and text_b:
                pairs.append((candidate_index, field, len(texts)))
                texts.extend([text_a, text_b])

    semantic_scores_list = [{} for _ in candidates]
    if texts:
        embeddings = model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        for candidate_index, field, start_index in pairs:
            score = float(embeddings[start_index] @ embeddings[start_index + 1])
            semantic_scores_list[candidate_index][field] = max(
                0.0, min(1.0, score)
            )

    return [
        _combine_field_scores(source_fields, candidate_fields, semantic_scores)
        for candidate_fields, semantic_scores in zip(
            candidate_fields_list, semantic_scores_list
        )
    ]


def convert_to_text(article: Dict[str, Any]) -> str:
    title = article.get("title") or ""
    keywords = article.get("keywords") or []
    abstract = article.get("abstract") or ""
    return (
        f"Título: {title}\n"
        f"Palavras-chave: {normalize_text(keywords)}\n"
        f"Resumo: {abstract}\n"
    )


def calculate_article_importance(article_a_text: str, article_b: Dict[str, Any]):
    return article_importance(article_a_text, convert_to_text(article_b))


def calculate_article_present(article_b: Dict[str, Any], h: int = 15) -> float:
    publication_year = article_b.get("year") or article_b.get("ano")
    if not publication_year or h <= 0:
        return 0.0

    age = max(0, datetime.date.today().year - int(publication_year))
    return 100.0 * (2 ** (-age / h))


def calculate_article_relevance(article_b: Dict[str, Any], base: float = 10) -> float:
    citations = article_b.get("cited_by_count") or 0
    if base <= 0:
        return 100.0
    return max(0.0, min(100.0, (citations / base) * 100.0))


def calculate_article_genre_compose(article_b: Dict[str, Any]) -> float:
    value = (article_b.get("genero") or {}).get("female_percentage", 0) or 0
    return max(0.0, min(100.0, float(value)))


def _importance_result(article_a_text: str, article_b: Dict[str, Any]) -> Dict[str, Any]:
    try:
        result = calculate_article_importance(article_a_text, article_b)
        if isinstance(result, BaseModel):
            result = result.model_dump(mode="json")
        return result or {}
    except Exception as error:
        return {"erro": str(error)[:200]}


def _compose_score(similarity_result: Dict[str, Any], article_b: Dict[str, Any],
                   importance_result_data: Dict[str, Any]) -> Dict[str, Any]:
    similarity_value = similarity_result.get("similarity", 0)
    importance_value = (
        importance_result_data.get("importance_score", 0)
        or importance_result_data.get("score", 0)
        or 0
    )
    present_result = calculate_article_present(article_b, h=5)
    relevance_result = calculate_article_relevance(article_b, base=10)
    genre_compose_result = calculate_article_genre_compose(article_b)

    total = (
        similarity_value * GERAL_WEIGHTS["similarity"]
        + importance_value * GERAL_WEIGHTS["importance"]
        + present_result * GERAL_WEIGHTS["present"]
        + relevance_result * GERAL_WEIGHTS["relevance"]
        + genre_compose_result * GERAL_WEIGHTS["genre_compose"]
    )

    return {
        "similarity": similarity_value,
        "field_scores": similarity_result.get("field_scores", {}),
        "importance": importance_value,
        "present": present_result,
        "relevance": relevance_result,
        "genre_compose": genre_compose_result,
        "total": total,
        "correction": importance_result_data,
    }


def calculate_score(article_a_text, article_a_data, article_b) -> Dict[str, Any]:
    similarity_result = calculate_article_similarity(article_a_data, article_b)
    importance_data = _importance_result(article_a_text, article_b)
    return _compose_score(similarity_result, article_b, importance_data)


def calculate_articles_scores(article_a, limit: int = 15, offset: int = 0):
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
    candidates = (articles_response or {}).get("candidatos", []) or []
    candidates = candidates[offset:offset + limit]

    if not candidates:
        return []

    # CPU/model work is batched; source embeddings are included only once per field.
    similarity_results = calculate_article_similarities(article_a_data, candidates)

    # Network-bound Gemini calls run concurrently with a conservative limit.
    importance_results = [None] * len(candidates)
    with ThreadPoolExecutor(max_workers=MAX_GEMINI_WORKERS) as executor:
        future_to_index = {
            executor.submit(_importance_result, article_a_text, candidate): index
            for index, candidate in enumerate(candidates)
        }
        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                importance_results[index] = future.result()
            except Exception as error:
                importance_results[index] = {"erro": str(error)[:200]}

    results = []
    for candidate, similarity_result, importance_data in zip(
        candidates, similarity_results, importance_results
    ):
        score_data = _compose_score(
            similarity_result,
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
    article_a = {
        "title": "Inteligência artificial na medicina",
        "summary": "Estudo sobre o uso de IA no diagnóstico de doenças.",
        "topics": [{"key_words": ["inteligência artificial", "medicina", "diagnóstico"]}],
    }
    article_b = {
        "title": "Aprendizado de máquina no diagnóstico médico",
        "abstract": "Pesquisa sobre modelos de IA para detectar doenças.",
        "keywords": ["IA", "medicina", "diagnóstico"],
    }

    result = calculate_article_similarity(article_a, article_b)
    print(f"Similaridade: {result['similarity']}/100")
    for field, score in result["field_scores"].items():
        print(f"{field}: {score}/100")