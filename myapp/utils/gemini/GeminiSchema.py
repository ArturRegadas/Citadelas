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


