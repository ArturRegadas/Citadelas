/* ============================================================
   CitaDelasRecommend — lógica da página "Recomendar"
   Estado agrupado em um único objeto (sem sopa de variáveis).
   Dados simulados verossímeis; pronto para trocar o mock por
   uma chamada real ao backend (pipeline Gemini -> OpenAlex ->
   Genderize) no método run().
   ============================================================ */
(function () {
  "use strict";

  const Shared = window.CitaDelasShared;

  /* ---------- Estado único e agrupado ---------- */
  const state = {
    view: "analisar", // "analisar" | "resultados"
    mode: "file", // "file" | "manual"
    file: null,
    tags: ["viés de gênero", "educação"],
    phase: "empty", // "empty" | "loading" | "error" | "done"
    results: [],
    error: null,
  };

  /* ---------- Dados simulados (contexto do domínio) ---------- */
  const SAMPLE_RESULTS = [
    {
      id: "oa-W4401122",
      title: "Oficinas de computação desplugada e o interesse de meninas por carreiras STEM",
      author: "Dra. Ana Paula Silva, Dra. Maria Oliveira",
      institution: "UFPE",
      year: 2024,
      citations: 84,
      relevance: 96,
      femaleShare: 100,
      area: "Educação em Computação",
      abstract:
        "Relato de experiência com oficinas desplugadas e digitais aplicadas a meninas do Ensino Fundamental II, avaliando o impacto no interesse por carreiras de tecnologia.",
      citation:
        "SILVA, A. P.; OLIVEIRA, M. Oficinas de computação desplugada e o interesse de meninas por carreiras STEM. Revista Brasileira de Educação em Computação, v. 12, n. 1, p. 22-41, 2024.",
    },
    {
      id: "oa-W4398871",
      title: "Mitigação de vieses algorítmicos de gênero em modelos de linguagem",
      author: "Dra. Beatriz Santos Lima",
      institution: "USP",
      year: 2023,
      citations: 142,
      relevance: 91,
      femaleShare: 67,
      area: "Inteligência Artificial",
      abstract:
        "Proposta de métricas para identificar estereótipos de gênero em representações vetoriais e auditar bases de treinamento de grandes modelos de linguagem.",
      citation:
        "LIMA, B. S. Mitigação de vieses algorítmicos de gênero em modelos de linguagem. Jornal de IA Ética, v. 8, p. 112-130, 2023.",
    },
    {
      id: "oa-W4377120",
      title: "Engenharia de tecidos e liderança feminina na biotecnologia brasileira",
      author: "Dra. Camila Nogueira Ribeiro, Dra. Juliana Prado",
      institution: "Unicamp",
      year: 2022,
      citations: 210,
      relevance: 88,
      femaleShare: 100,
      area: "Biotecnologia",
      abstract:
        "Estudo translacional de biomateriais poliméricos para regeneração celular conduzido por equipes com liderança feminina, com análise de produção patenteada.",
      citation:
        "RIBEIRO, C. N.; PRADO, J. Engenharia de tecidos e liderança feminina na biotecnologia brasileira. Biotecnologia Hoje, v. 5, p. 44-69, 2022.",
    },
  ];

  const LOADING_STEPS = [
    "Analisando o contexto com o Gemini",
    "Buscando trabalhos relacionados no OpenAlex",
    "Estimando autoria feminina com o Genderize",
    "Organizando as recomendações",
  ];

  /* ---------- Atalhos de DOM ---------- */
  const $ = (id) => document.getElementById(id);

  /* ====================== NAVEGAÇÃO POR ABAS ====================== */
  function switchView(view) {
    state.view = view;
    ["analisar", "resultados"].forEach((v) => {
      const section = $(`cd-view-${v}`);
      section.hidden = v !== view;
      const btn = $(`cd-tabview-${v}`);
      btn.classList.toggle("is-active", v === view);
      btn.setAttribute("aria-selected", String(v === view));
      // Reaplica a animação de entrada na seção que passa a aparecer.
      if (v === view) {
        section.style.animation = "none";
        void section.offsetWidth; // força reflow
        section.style.animation = "";
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ====================== MODO DO FORMULÁRIO ====================== */
  function setMode(mode) {
    state.mode = mode;
    const isFile = mode === "file";
    $("cd-panel-file").hidden = !isFile;
    $("cd-panel-manual").hidden = isFile;

    const tabFile = $("cd-tab-file");
    const tabManual = $("cd-tab-manual");
    tabFile.classList.toggle("is-active", isFile);
    tabManual.classList.toggle("is-active", !isFile);
    tabFile.setAttribute("aria-selected", String(isFile));
    tabManual.setAttribute("aria-selected", String(!isFile));
  }

  /* ====================== UPLOAD DE ARQUIVO ====================== */
  function onFileSelected(file) {
    if (!file) return;
    const okType =
      file.type === "application/pdf" ||
      file.type === "text/plain" ||
      /\.(pdf|txt)$/i.test(file.name);
    if (!okType) {
      Shared.toast("Envie um arquivo PDF ou TXT.", "error");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      Shared.toast("O arquivo ultrapassa o limite de 15 MB.", "error");
      return;
    }
    state.file = file;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    $("cd-file-name").textContent = `${file.name} · ${sizeMb} MB`;
    $("cd-file-info").hidden = false;
    $("cd-dropzone").classList.add("is-drag");
    Shared.toast("Arquivo anexado.");
  }

  function clearFile() {
    state.file = null;
    $("cd-file-input").value = "";
    $("cd-file-info").hidden = true;
    $("cd-dropzone").classList.remove("is-drag");
  }

  /* ====================== TAGS ====================== */
  function renderTags() {
    const container = $("cd-tags");
    container.innerHTML = state.tags
      .map(
        (tag, i) => `
        <span class="cd-chip">
          <span class="cd-truncate">${Shared.escapeHtml(tag)}</span>
          <button type="button" data-cd-tag="${i}" aria-label="Remover ${Shared.escapeHtml(tag)}">&times;</button>
        </span>`
      )
      .join("");
  }
  function addTag(value) {
    const v = value.trim();
    if (v && !state.tags.includes(v)) {
      state.tags.push(v);
      renderTags();
    }
  }
  function removeTag(index) {
    state.tags.splice(index, 1);
    renderTags();
  }

  /* ====================== EXEMPLO ====================== */
  function loadSample() {
    setMode("manual");
    $("cd-input-title").value =
      "Viés de gênero em modelos de linguagem aplicados à triagem clínica";
    $("cd-input-abstract").value =
      "Este trabalho investiga como vieses de gênero presentes em modelos de linguagem afetam recomendações de triagem clínica, propondo um protocolo de auditoria antes do uso assistencial.";
    updateCharCount();
    state.tags = ["viés de gênero", "modelos de linguagem", "saúde"];
    renderTags();
    Shared.toast("Exemplo carregado no formulário.");
    $("cd-input-title").focus();
  }

  function updateCharCount() {
    const val = $("cd-input-abstract").value;
    $("cd-char-counter").textContent = `${val.length} / 2000`;
  }

  /* ====================== FASES / ESTADOS ====================== */
  function setPhase(phase) {
    state.phase = phase;
    $("cd-empty").hidden = phase !== "empty";
    $("cd-loading").hidden = phase !== "loading";
    $("cd-error").hidden = phase !== "error";
    $("cd-papers").hidden = phase !== "done";
    $("cd-sort-wrap").hidden = phase !== "done";
    $("cd-more-wrap").hidden = phase !== "done";

    const btn = $("cd-analyze");
    btn.classList.toggle("is-loading", phase === "loading");
    btn.disabled = phase === "loading";
    $("cd-analyze-label").textContent =
      phase === "loading" ? "Analisando…" : "Analisar e recomendar";
  }

  function validate() {
    if (state.mode === "file" && !state.file) {
      return "Anexe o PDF ou TXT do artigo para continuar.";
    }
    if (state.mode === "manual" && !$("cd-input-title").value.trim()) {
      return "Informe ao menos o título do artigo.";
    }
    return null;
  }

  /* ====================== EXECUÇÃO (mock do pipeline) ====================== */
  let stepTimer = null;
  function run() {
    setPhase("loading");
    let step = 0;
    $("cd-loading-step").textContent = LOADING_STEPS[0];
    clearInterval(stepTimer);
    stepTimer = setInterval(() => {
      step = (step + 1) % LOADING_STEPS.length;
      $("cd-loading-step").textContent = LOADING_STEPS[step];
    }, 850);

    // TODO backend: substituir por fetch('/api/citadelas/analyze') com o
    // arquivo/dados e consumir o JSON do pipeline Gemini -> OpenAlex -> Genderize.
    setTimeout(() => {
      clearInterval(stepTimer);
      try {
        state.results = SAMPLE_RESULTS.slice();
        state.error = null;
        setPhase("done");
        render();
        updateTabCount();
        switchView("resultados");
        Shared.toast("Recomendações geradas.");
      } catch (err) {
        showError("Erro ao processar", "Tente novamente em instantes.");
      }
    }, 2600);
  }

  function showError(title, desc) {
    clearInterval(stepTimer);
    state.error = { title, desc };
    $("cd-error-title").textContent = title;
    $("cd-error-desc").textContent = desc;
    setPhase("error");
  }

  function retry() {
    run();
  }

  function updateTabCount() {
    const badge = $("cd-tabview-count");
    if (!badge) return;
    badge.textContent = String(state.results.length);
    badge.hidden = state.results.length === 0;
  }

  /* ====================== RENDER DOS RESULTADOS ====================== */
  function sorted() {
    const by = $("cd-sort").value;
    const list = state.results.slice();
    if (by === "recent") list.sort((a, b) => b.year - a.year);
    else if (by === "citations") list.sort((a, b) => b.citations - a.citations);
    else list.sort((a, b) => b.relevance - a.relevance);
    return list;
  }

  function render() {
    if (state.phase !== "done") return;
    const container = $("cd-papers");
    container.innerHTML = sorted().map(paperCard).join("");
  }

  function paperCard(p) {
    const saved = Shared.isSaved(p.id);
    return `
      <article class="cd-paper">
        <div class="cd-paper__top">
          <div class="cd-paper__badges">
            <span class="cd-stamp">${p.relevance}% aderência</span>
            <span class="cd-badge cd-badge--teal">${Shared.escapeHtml(p.area)}</span>
            <span class="cd-badge">${p.year}</span>
            ${
              p.femaleShare === 100
                ? '<span class="cd-badge cd-badge--brand"><i class="fa-solid fa-venus"></i> Autoria 100% feminina</span>'
                : ""
            }
          </div>
          <button type="button" class="cd-paper__save ${saved ? "is-saved" : ""}" data-cd-save="${p.id}">
            <i class="fa-${saved ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i>
            <span>${saved ? "Salva" : "Salvar"}</span>
          </button>
        </div>

        <div>
          <h3 class="cd-paper__title cd-break cd-clamp-2">${Shared.escapeHtml(p.title)}</h3>
          <p class="cd-paper__author cd-break cd-clamp-1">
            <i class="fa-solid fa-user-graduate" aria-hidden="true"></i>
            <span class="cd-truncate">${Shared.escapeHtml(p.author)} · ${Shared.escapeHtml(p.institution)}</span>
          </p>
        </div>

        <p class="cd-paper__abstract cd-break cd-clamp-3">${Shared.escapeHtml(p.abstract)}</p>

        <div class="cd-paper__meters">
          <div>
            <div class="cd-paper__meter-head"><span>Aderência de conteúdo</span><span class="cd-val-brand">${p.relevance}%</span></div>
            <div class="cd-meter cd-meter--brand"><span style="width:${p.relevance}%"></span></div>
          </div>
          <div>
            <div class="cd-paper__meter-head"><span>Provável autoria feminina</span><span class="cd-val-gold">${p.femaleShare}%</span></div>
            <div class="cd-meter"><span style="width:${p.femaleShare}%;background:var(--cd-gold)"></span><span style="width:${100 - p.femaleShare}%;background:var(--cd-line)"></span></div>
          </div>
        </div>

        <div class="cd-cite-box">
          <div class="cd-cite-box__head">
            <span class="cd-cite-box__label">Citação ABNT</span>
            <button type="button" class="cd-copy" data-cd-copy="${p.id}">
              <i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar
            </button>
          </div>
          <p class="cd-cite-box__text cd-break">${Shared.escapeHtml(p.citation)}</p>
        </div>
      </article>`;
  }

  /* ====================== AÇÕES DOS CARDS ====================== */
  function handleResultsClick(e) {
    const saveBtn = e.target.closest("[data-cd-save]");
    if (saveBtn) {
      const id = saveBtn.getAttribute("data-cd-save");
      const paper = state.results.find((p) => p.id === id);
      if (paper) {
        Shared.toggleSaved({
          id: paper.id,
          title: paper.title,
          author: paper.author,
          citation: paper.citation,
        });
        render();
      }
      return;
    }
    const copyBtn = e.target.closest("[data-cd-copy]");
    if (copyBtn) {
      const id = copyBtn.getAttribute("data-cd-copy");
      const paper = state.results.find((p) => p.id === id);
      if (paper) {
        navigator.clipboard
          .writeText(paper.citation)
          .then(() => Shared.toast("Citação copiada."))
          .catch(() => Shared.toast("Não foi possível copiar.", "error"));
      }
    }
  }

  /* ====================== BIND ====================== */
  document.addEventListener("DOMContentLoaded", () => {
    renderTags();
    setMode("file");
    setPhase("empty");
    switchView("analisar");

    // Dropzone
    const dz = $("cd-dropzone");
    const input = $("cd-file-input");
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => onFileSelected(e.target.files[0]));
    ["dragover", "dragenter"].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        dz.classList.add("is-drag");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === "drop" && e.dataTransfer.files[0]) onFileSelected(e.dataTransfer.files[0]);
        else if (!state.file) dz.classList.remove("is-drag");
      })
    );

    // Tags
    $("cd-input-tag").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag(e.target.value);
        e.target.value = "";
      }
    });
    $("cd-tags").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cd-tag]");
      if (btn) removeTag(Number(btn.getAttribute("data-cd-tag")));
    });

    // Abstract counter
    $("cd-input-abstract").addEventListener("input", updateCharCount);

    // Submit
    $("cd-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const err = validate();
      if (err) {
        Shared.toast(err, "error");
        return;
      }
      run();
    });

    // Results
    $("cd-papers").addEventListener("click", handleResultsClick);
  });

  window.CitaDelasRecommend = { setMode, clearFile, loadSample, render, retry, switchView };
})();
