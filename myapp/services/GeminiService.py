import time
from google import genai
from google.genai import types

from myapp.utils.gemini.GeminiPrompt import ARTICLE_ANALYSIS_PROMPT, IMPORTANCE_ANALYSIS_PROMPT
from myapp.utils.gemini.GeminiSchema import ArticleContextSchema, ImportanceAnalysisSchema
from myapp.config import Config


# ------------------------------------------------------------
# Resiliência: o Gemini às vezes responde 503 (sobrecarregado) ou
# "model is overloaded". São erros transitórios do lado do Google.
# Tentamos de novo com espera crescente antes de desistir.
# NÃO altera prompt nem schema — apenas re-executa a chamada.
# ------------------------------------------------------------
_RETRYABLE_MARKERS = ("503", "overloaded", "unavailable", "500", "deadline", "timeout")


def _is_retryable(erro: Exception) -> bool:
    texto = str(erro).lower()
    return any(m in texto for m in _RETRYABLE_MARKERS)


def _generate_with_retry(call, tentativas: int = 4):
    """Executa `call()` com retry/backoff para erros transitórios do Gemini."""
    ultimo_erro = None
    for i in range(tentativas):
        try:
            return call()
        except Exception as erro:
            ultimo_erro = erro
            if not _is_retryable(erro) or i == tentativas - 1:
                raise
            # backoff: 1s, 2s, 4s...
            time.sleep(2 ** i)
    raise ultimo_erro


def analyze_article(article: str) -> ArticleContextSchema:
    client = genai.Client(api_key=Config.GEMINI_API_KEY)

    response = _generate_with_retry(lambda: client.models.generate_content(
        model=Config.GEMINI_MODEL,
        contents=[
            ARTICLE_ANALYSIS_PROMPT,
            f"Analise o seguinte artigo:\n\n{article}"
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ArticleContextSchema,
            max_output_tokens = 8192,
            temperature=0.2,
        )
    ))

    if not response.text:
        raise ValueError("Gemini retornou uma resposta vazia.")

    return ArticleContextSchema.model_validate_json(response.text)

"""
{
  "title": "Mapa do Brasil em Impressão 3D: Uma Nova Abordagem para o Ensino de Geografia",
  "research_objective": "Relatar e analisar a experiência de aplicação de um recurso tangível produzido por impressão 3D (um mapa do Brasil em formato de quebra-cabeça) junto a estudantes do Ensino Fundamental, compreendendo aspectos relacionados ao engajamento, às percepções sobre o recurso didático e às interações observadas durante a atividade.",
  "research_area": "Informática na Educação",
  "summary": "A pesquisa investiga o desenvolvimento e a aplicação de um material didático tridimensional fabricado com impressora 3D para o ensino do mapa político do Brasil a alunos do 6º ano do Ensino Fundamental em uma escola pública. Utilizando a metodologia Design Science Research (DSR), o estudo avaliou o artefato por meio de questionários e observações em sala de aula. Os resultados indicam que o recurso tridimensional estimulou a interação colaborativa, aumentou o engajamento e favoreceu a compreensão do território brasileiro pelos estudantes.",
  "topics": [
    {
      "theme": "Uso de impressora 3D e manufatura aditiva na educação",
      "description": "Necessidade de referências sobre a aplicação de tecnologias de fabricação aditiva e objetos impressos em 3D como recursos pedagógicos na educação básica.",
      "key_words": [
        "impressão 3D",
        "manufatura aditiva",
        "material didático",
        "tecnologia educacional"
      ],
      "purpose": "related_works"
    },
    {
      "theme": "Ensino de cartografia e geografia na educação básica",
      "description": "Investigação de conceitos, desafios e estratégias para o ensino de representações espaciais, cartografia escolar e letramento geográfico.",
      "key_words": [
        "ensino de geografia",
        "cartografia escolar",
        "letramento geográfico",
        "mapa político do Brasil"
      ],
      "purpose": "theoretical_framework"
    },
    {
      "theme": "Metodologia Design Science Research (DSR)",
      "description": "Busca por referências metodológicas que fundamentem a criação, construção e avaliação de artefatos voltados para a solução de problemas educacionais.",
      "key_words": [
        "Design Science Research",
        "DSR",
        "pesquisa de design",
        "desenvolvimento de artefatos"
      ],
      "purpose": "method"
    },
    {
      "theme": "Metodologias ativas e materiais concretos no aprendizado",
      "description": "Estudos sobre o impacto de abordagens pedagógicas participativas e o uso de objetos manipuláveis no engajamento e na aprendizagem dos alunos.",
      "key_words": [
        "metodologias ativas",
        "materiais concretos",
        "aprendizagem colaborativa",
        "recursos tangíveis"
      ],
      "purpose": "related_works"
    }
  ],
  "existing_references": [
    {
      "title": "Modelos didáticos concretos tridimensionais: definição e classificação aplicadas ao ensino de geografia física e dos componentes físico-natural da geografia escolar",
      "authors": [
        "Albuquerque, F. N. B. d."
      ],
      "year": 2023
    },
    {
      "title": "Uso da impressão 3d no ensino-aprendizagem: Revisão sistemática sobre os principais problemas encontrados",
      "authors": [
        "Caruso, R. C.",
        "de Carvalho Rutz da Silva, S.",
        "Marcondes, R."
      ],
      "year": 2023
    },
    {
      "title": "Research Design: Qualitative, Quantitative, and Mixed Methods Approaches",
      "authors": [
        "Creswell, J. W."
      ],
      "year": 2014
    },
    {
      "title": "A geografia escolar e os recursos didáticos: o uso das maquetes no ensino-aprendizagem da geografia",
      "authors": [
        "da Silva, V.",
        "Muniz, A."
      ],
      "year": 2012
    },
    {
      "title": "O estado da arte do ensino de cartografia para o 6º ano do ensino fundamental",
      "authors": [
        "de Jesus Lelis, D. A.",
        "Portilho, E. M. L."
      ],
      "year": 2022
    },
    {
      "title": "A impressão 3d no âmbito das representações cartográficas",
      "authors": [
        "Graça, A.",
        "Fosse, J.",
        "Veiga, L.",
        "Botelho, M."
      ],
      "year": 2021
... (94 linhas)"""



def article_importance(article_a, article_b):
    client = genai.Client(api_key=Config.GEMINI_API_KEY)
    
    response = _generate_with_retry(lambda: client.models.generate_content(
        model=Config.GEMINI_MODEL,
        contents=[
            IMPORTANCE_ANALYSIS_PROMPT,
            f"segue o artigo original:\n\n{article_a}\n\nsegue o artigo candidato:\n\n{article_b}"
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ImportanceAnalysisSchema,
            max_output_tokens= 8192,
            temperature=0.2
        )
    ))

    if not response.text:
        raise ValueError("Gemini retornou uma resposta vazia.")

    return ImportanceAnalysisSchema.model_validate_json(response.text)

