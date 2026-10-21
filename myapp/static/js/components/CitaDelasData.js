/* ============================================================
   CitaDelasData — fonte de dados simulada do painel de resultados.
   Mantida isolada para que o backend substitua window.CitaDelasData
   por um JSON com a mesma estrutura, vindo do pipeline
   Gemini -> OpenAlex -> Genderize.
   ============================================================ */
(function () {
  "use strict";

  const recommendations = [
    {
      id: "oa-W4401122",
      shortLabel: "Computação para meninas",
      title: "Oficinas de computação desplugada e o interesse de meninas por carreiras STEM",
      summary:
        "Relato de experiência com oficinas desplugadas e digitais aplicadas a meninas do Ensino Fundamental II, avaliando o impacto no interesse por carreiras de tecnologia.",
      objective:
        "Investigar como oficinas práticas adaptadas despertam o interesse pela computação e reduzem estereótipos de gênero.",
      authors: ["Dra. Ana Paula Silva", "Dra. Maria Oliveira"],
      institution: "UFPE",
      year: 2024,
      citations: 84,
      match: 96,
      openAccess: true,
      gender: { women: 100, men: 0 },
      metrics: { similarity: 96, problem_fit: 94, freshness: 98, openalex_relevance: 91, reliability: 95 },
      keywords: ["pensamento computacional", "meninas", "STEM"],
      abnt:
        "SILVA, A. P.; OLIVEIRA, M. Oficinas de computação desplugada e o interesse de meninas por carreiras STEM. Revista Brasileira de Educação em Computação, v. 12, n. 1, p. 22-41, 2024.",
      topics: [
        { id: "T1", title: "Pensamento computacional inclusivo", desc: "Atividades adaptadas para a educação básica.", keywords: ["pensamento computacional", "STEM"], role: "trabalhos relacionados" },
        { id: "T2", title: "Avaliação de retenção", desc: "Análise do interesse após a oficina.", keywords: ["retenção", "equidade"], role: "método" },
      ],
      references: [
        { title: "Gender Gap in STEM: Early Interventions", authors: ["Carla Mendes"], year: 2022 },
      ],
    },
    {
      id: "oa-W4398871",
      shortLabel: "Viés em IA",
      title: "Mitigação de vieses algorítmicos de gênero em modelos de linguagem",
      summary:
        "Proposta de métricas para identificar estereótipos de gênero em representações vetoriais e auditar bases de treinamento de grandes modelos de linguagem.",
      objective:
        "Desenvolver métricas estatísticas para quantificar estereótipos em embeddings de gênero.",
      authors: ["Dra. Beatriz Santos Lima", "Prof. Roberto Lima", "Dra. Elena Rostova"],
      institution: "USP",
      year: 2023,
      citations: 142,
      match: 91,
      openAccess: false,
      gender: { women: 67, men: 33 },
      metrics: { similarity: 92, problem_fit: 90, freshness: 88, openalex_relevance: 95, reliability: 94 },
      keywords: ["viés de gênero", "IA ética", "auditoria"],
      abnt:
        "LIMA, B. S.; LIMA, R.; ROSTOVA, E. Mitigação de vieses algorítmicos de gênero em modelos de linguagem. Jornal de IA Ética, v. 8, p. 112-130, 2023.",
      topics: [
        { id: "T1", title: "Auditoria algorítmica semântica", desc: "Inspeção de embeddings e representações latentes.", keywords: ["viés de gênero", "auditoria"], role: "fundamentação" },
      ],
      references: [
        { title: "Fairness in Machine Learning Systems", authors: ["Lucia Fernandez"], year: 2021 },
      ],
    },
    {
      id: "oa-W4377120",
      shortLabel: "Biotecnologia",
      title: "Engenharia de tecidos e liderança feminina na biotecnologia brasileira",
      summary:
        "Estudo translacional de biomateriais poliméricos para regeneração celular conduzido por equipes com liderança feminina, com análise de produção patenteada.",
      objective:
        "Analisar a viabilidade celular de matrizes 3D e catalogar indicadores de produção de pesquisadoras.",
      authors: ["Dra. Camila Nogueira Ribeiro", "Dra. Juliana Prado"],
      institution: "Unicamp",
      year: 2022,
      citations: 210,
      match: 88,
      openAccess: true,
      gender: { women: 100, men: 0 },
      metrics: { similarity: 89, problem_fit: 85, freshness: 80, openalex_relevance: 90, reliability: 98 },
      keywords: ["scaffolds 3D", "biotecnologia", "propriedade intelectual"],
      abnt:
        "RIBEIRO, C. N.; PRADO, J. Engenharia de tecidos e liderança feminina na biotecnologia brasileira. Biotecnologia Hoje, v. 5, p. 44-69, 2022.",
      topics: [
        { id: "T1", title: "Biomateriais de alta regeneração", desc: "Scaffolds poliméricos para cultura celular.", keywords: ["scaffolds 3D", "patentes"], role: "método" },
      ],
      references: [],
    },
    {
      id: "oa-W4365002",
      shortLabel: "Robótica pedagógica",
      title: "Robótica educacional e inclusão de autoras no ensino de exatas",
      summary:
        "Plataformas robóticas abertas de baixo custo aplicadas para incentivar o engajamento de estudantes do sexo feminino em disciplinas de exatas.",
      objective:
        "Avaliar o impacto da construção de hardware aberto no desempenho e na motivação em exatas.",
      authors: ["Dra. Fernanda Ramos", "Dra. Patrícia Kelly", "Prof. Carlos Duarte"],
      institution: "IFSP",
      year: 2024,
      citations: 65,
      match: 93,
      openAccess: true,
      gender: { women: 67, men: 33 },
      metrics: { similarity: 94, problem_fit: 92, freshness: 97, openalex_relevance: 88, reliability: 92 },
      keywords: ["robótica", "hardware livre", "inclusão"],
      abnt:
        "RAMOS, F.; KELLY, P.; DUARTE, C. Robótica educacional e inclusão de autoras no ensino de exatas. Anais de Robótica Educacional, 2024.",
      topics: [
        { id: "T1", title: "Hardware livre na educação", desc: "Kits de prototipagem acessíveis para a sala de aula.", keywords: ["robótica", "inclusão"], role: "método" },
      ],
      references: [],
    },
    {
      id: "oa-W4350019",
      shortLabel: "Dados abertos",
      title: "Arquiteturas de dados abertos e visibilidade de gênero na ciência",
      summary:
        "Indexação semântica e ontologias de dados para reduzir disparidades históricas de citações em repositórios abertos.",
      objective:
        "Mapear redes de citação e propor algoritmos de recomendação mais equilibrados.",
      authors: ["Dra. Vanessa Martins", "Dra. Renata Vasconcelos"],
      institution: "UFRGS",
      year: 2023,
      citations: 118,
      match: 90,
      openAccess: true,
      gender: { women: 100, men: 0 },
      metrics: { similarity: 91, problem_fit: 88, freshness: 90, openalex_relevance: 96, reliability: 95 },
      keywords: ["ontologia", "dados abertos", "visibilidade"],
      abnt:
        "MARTINS, V.; VASCONCELOS, R. Arquiteturas de dados abertos e visibilidade de gênero na ciência. Data Science Journal, 2023.",
      topics: [
        { id: "T1", title: "Grafos de conhecimento científico", desc: "Modelagem ontológica para autorias sub-representadas.", keywords: ["ontologia", "visibilidade"], role: "fundamentação" },
      ],
      references: [],
    },
  ];

  /* Análise do PDF submetido com locais de citação sugeridos. */
  const document = {
    title: "Introdução à ciência da computação para meninas",
    authors: "Luiza Andrade · Marcos Teixeira · 2025",
    pages: [
      {
        number: 1,
        paragraphs: [
          { id: "P1", text: "A participação feminina na área de tecnologia continua sendo um desafio relevante para instituições de ensino. A baixa representação de meninas em atividades de computação está associada a fatores sociais, educacionais e culturais." },
          { id: "P2", text: "Intervenções realizadas durante a educação básica podem aproximar estudantes do campo da computação. Oficinas práticas e experiências de programação são estratégias usadas para apresentar possibilidades profissionais e reduzir barreiras de entrada." },
          { id: "P3", text: "Nesse contexto, iniciativas voltadas especificamente para meninas podem criar ambientes de aprendizagem em que elas desenvolvam confiança para participar de atividades da área." },
        ],
      },
      {
        number: 2,
        paragraphs: [
          { id: "P4", text: "O estudo investiga uma intervenção educacional baseada em oficinas práticas de computação, combinando atividades desplugadas e digitais, sem depender de conhecimento prévio de programação." },
          { id: "P5", text: "A avaliação considera o interesse das participantes, a percepção sobre a computação e a intenção de continuar aprendendo após as atividades." },
          { id: "P6", text: "Além da dimensão técnica, a pesquisa observa a percepção das estudantes sobre estereótipos de gênero presentes no campo da tecnologia." },
        ],
      },
      {
        number: 3,
        paragraphs: [
          { id: "P7", text: "Os resultados indicam mudanças positivas na percepção das participantes após as oficinas, com diferentes níveis de interesse ao longo da intervenção." },
          { id: "P8", text: "Os achados reforçam a importância de estratégias educacionais que apresentem a computação de forma acessível e contextualizada para a educação básica." },
          { id: "P9", text: "Como trabalhos futuros, recomenda-se acompanhar as participantes por mais tempo para verificar o efeito do contato inicial sobre escolhas profissionais." },
        ],
      },
    ],
    citations: [
      { id: "C1", page: 1, paragraphId: "P2", anchor: "Intervenções realizadas durante a educação básica podem aproximar estudantes do campo da computação.", quote: "Oficinas práticas e experiências de programação são estratégias usadas para apresentar possibilidades profissionais e reduzir barreiras de entrada.", reason: "A recomendação de Silva e Oliveira (2024) descreve oficinas práticas para meninas e mede seu efeito sobre o interesse por STEM, sustentando a afirmação sobre intervenções na educação básica.", color: "terracotta", label: "Fundamentação", recId: "oa-W4401122" },
      { id: "C2", page: 1, paragraphId: "P3", anchor: "iniciativas voltadas especificamente para meninas podem criar ambientes de aprendizagem", quote: "iniciativas voltadas especificamente para meninas podem criar ambientes de aprendizagem", reason: "O trabalho recomendado foca justamente em ambientes de aprendizagem desenhados para meninas, com relação temática direta.", color: "brick", label: "Contextualização", recId: "oa-W4401122" },
      { id: "C3", page: 2, paragraphId: "P6", anchor: "estereótipos de gênero presentes no campo da tecnologia", quote: "a pesquisa observa a percepção das estudantes sobre estereótipos de gênero presentes no campo da tecnologia.", reason: "Lima (2023) investiga vieses de gênero em tecnologia, servindo como referência complementar para a discussão sobre estereótipos.", color: "gold", label: "Discussão de gênero", recId: "oa-W4398871" },
      { id: "C4", page: 3, paragraphId: "P8", anchor: "estratégias educacionais que apresentem a computação de forma acessível", quote: "Os achados reforçam a importância de estratégias educacionais que apresentem a computação de forma acessível e contextualizada para a educação básica.", reason: "As oficinas desplugadas da recomendação de Silva e Oliveira (2024) exemplificam estratégias acessíveis, apoiando a conclusão dos resultados.", color: "teal", label: "Apoio aos resultados", recId: "oa-W4401122" },
    ],
  };

  window.CitaDelasData = { recommendations, document };
})();
