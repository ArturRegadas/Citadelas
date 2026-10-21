from google import genai
from google.genai import types

from myapp.utils.gemini.GeminiPrompt import ARTICLE_ANALYSIS_PROMPT
from myapp.utils.gemini.GeminiSchema import ArticleContextSchema
from myapp.config import Config

def analyze_article(article: str) -> ArticleContextSchema:
    client = genai.Client(api_key=Config.GEMINI_API_KEY)

    response = client.models.generate_content(
        model=Config.GEMINI_MODEL,
        contents=[
            ARTICLE_ANALYSIS_PROMPT,
            f"Analise o seguinte artigo:\n\n{article}"
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ArticleContextSchema,
            temperature=0.2,
        )
    )

    if not response.text:
        raise ValueError("Gemini retornou uma resposta vazia.")

    return ArticleContextSchema.model_validate_json(response.text)



