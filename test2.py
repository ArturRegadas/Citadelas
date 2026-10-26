import os
from myapp.services.Article import *
from myapp.services.ExtractTextService import extract_file_text
from myapp.services.GeminiService import analyze_article
from myapp.services.OpenAlex import AlexService
from datetime import datetime


init = datetime.now()
print(datetime.now() - init)


DIRETORIO_ATUAL = os.path.dirname(os.path.abspath(__file__))  # Linha 1: Obtém o diretório atual do script

#Linha 2: Junta a pasta do script com o nome do arquivo de forma segura
CAMINHO_ARQUIVO = os.path.join(DIRETORIO_ATUAL, "artigo.pdf")

#Linha 2: Verifica se o arquivo de teste realmente existe na pasta
if not os.path.exists(CAMINHO_ARQUIVO):
    print(f"Erro: O arquivo '{CAMINHO_ARQUIVO}' não foi encontrado.")
else:
    # Linha 3: Abre o arquivo local no modo de leitura de bytes ("rb")
    with open(CAMINHO_ARQUIVO, "rb") as arquivo:
        # Linha 4: Lê todo o conteúdo do arquivo e guarda na variável como bytes
        conteudo_bytes = arquivo.read()

    # Linha 5: Extrai apenas o nome do arquivo a partir do caminho
    nome_arquivo = os.path.basename(CAMINHO_ARQUIVO)

    print("Iniciando o teste do pipeline CitaDelas...")

    # Linha 6: Chama o Service diretamente, sem passar por nenhuma Web API
    resultado = extract_file_text(
        conteudo_bytes, nome_arquivo
    )

    # Linha 7: Imprime o resultado retornado do pipeline
    print("\n--- RESULTADO DO TESTE ---")


    obj = analyze_article(resultado) # usa IA
    #print(f"Titulo: {obj.title}\n\n\n Resumo:  {obj.summary}\n\n\n Reserach area: {obj.research_area}\n\n\n Objetivo: {obj.research_objective} \n\n\n Topics: {obj.topics}\n\n\n Referencias: {obj.existing_references}")
    print(datetime.now() - init)

    service = AlexService()
    articles = service.buscar_artigos_para_comparacao(
        entrada=obj,
        limite_percentual=25,
        country_id="BR",
        fallback_qtd=5,
    )
    print(datetime.now() - init)

    print(len(articles["candidatos"]))
    print()

    for i in articles["candidatos"]:
        print(calculate_article_importance(resultado, i)) #ok usa IA
        print(datetime.now() - init)
        print(calculate_article_similarity(obj, i)) # ok
        print(datetime.now() - init)
        print()
        