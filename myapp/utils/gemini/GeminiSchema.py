from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from enum import Enum


#============================== Schema for Gemini =============================#

# Purpose enum for Topic schema
class TopicPurpose(str, Enum):
    METHOD = "method"
    RELATED_WORKS = "related_works"
    THEORETICAL_FRAMEWORK = "theoretical_framework"
    CONTEXT = "context"


# Topic schema
class TopicSchema(BaseModel):
    theme: str = Field(description="O tema especifico que necessita outras referências específicas")
    description: str = Field("breve descrição do tema presente no artigo")
    key_words: list[str] = Field(
                            min_length=1,
                            description="Termos específicos para buscar artigos científicos relacionados ao tópico."
                            )
    purpose: TopicPurpose = Field(description="Finalidade bibliográfica do tópico.")

# Existing References
class ExistingReference(BaseModel):
    doi: str | None = None
    title: str
    authors: list[str]
    year: int | None = None


# Define schema for gemini
# Each attribute in class represent a "key" in Gemini JSON response
class ArticleContextSchema(BaseModel):
    title: str  = Field(description="O título, tema, principal do artigo do usuário")
    research_objective: str = Field(description="O objetivo principal da pesquisa/artigo")
    research_area: str = Field(description="A principal área científica relacionada com o artigo do usuario")
    summary: str = Field(description="Um breve resumo do artigo do usuário")
    topics: list[TopicSchema] = Field(
                    min_length=1,
                    description="Tópicos que representam necessidades bibliográficas distintas"
                    )
    existing_references: list[ExistingReference] = Field(
        description="Referências já presentes no artigo, quando identificáveis",
        default_factory=list
    )

#===========================================================================================#



from pydantic import BaseModel, Field


class EvidenceSchema(BaseModel):
    quote: str = Field(
        description="Trecho literal do resumo do artigo candidato que sustenta a avaliação."
    )
    relevance: str = Field(
        description="Explicação de como o trecho sustenta a relevância do artigo."
    )


class CitationLocationSchema(BaseModel):
    page: int | None = Field(
        default=None,
        description="Número da página onde a citação pode ser inserida."
    )
    line: int | None = Field(
        default=None,
        description="Número da linha do texto onde a citação pode ser inserida."
    )
    word: int | None = Field(
        default=None,
        description="Posição da palavra onde a citação pode ser inserida."
    )
    paragraph_id: int | None = Field(
        default=None,
        description="Identificador do parágrafo onde a citação pode ser inserida."
    )
    anchor_quote: str = Field(
        description="Trecho literal do texto original que identifica o local recomendado."
    )
    citation_function: str = Field(
        description=(
            "Função da citação: fundamentação teórica, apoio a uma afirmação, "
            "comparação de resultados, justificativa metodológica ou "
            "contextualização do problema."
        )
    )
    reason: str = Field(
        description="Explicação de por que o artigo é pertinente nesse local."
    )


class FieldScoreSchema(BaseModel):
    criterion: str = Field(
        description="Nome do critério avaliado."
    )
    score: float = Field(
        description="Pontuação do critério, de 0 a 100."
    )


class ImportanceAnalysisSchema(BaseModel):
    importance_score: float = Field(
        description="Pontuação final de importância do artigo, de 0 a 100."
    )
    h: float = Field(
        description="Meia-vida da área científica do artigo, em anos."
    )
    base: float = Field(
        description="Média de citações de artigos da mesma área."
    )
    field_scores: list[FieldScoreSchema] = Field(
        description="Pontuações individuais dos critérios avaliados.",
        default_factory=list
    )
    justification: str = Field(
        description="Justificativa da avaliação de relevância."
    )
    evidence: list[EvidenceSchema] = Field(
        description="Evidências do artigo candidato que sustentam a avaliação.",
        default_factory=list
    )
    uncertainty: str = Field(
        description='Nível de incerteza: "baixa", "média" ou "alta".'
    )
    using: list[CitationLocationSchema] = Field(
        description=(
            "Locais da pesquisa original onde o artigo candidato pode ser "
            "utilizado como citação. Pode ser vazia quando não houver "
            "uma localização justificável."
        ),
        default_factory=list
    )