/* ============================================================
   CitaDelasResult — página de recomendações.
   Consome o contrato enviado pelo backend:
     { source, recommendations: [{ article: {
         article_data: {...genero...}, score_data: {...correction...}
     }}]}
   Fonte dos dados: sessionStorage (fluxo fetch) ou JSON embutido
   pelo servidor (navegação direta). Sem gráficos externos.
   ============================================================ */
(function () {
  "use strict";

  const Shared = window.CitaDelasShared;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => Shared.escapeHtml(s);

  const STORAGE_KEY = "citadelas:lastResult";

  const state = {
    source: {},
    items: [], // lista normalizada e plana
    filters: { femaleOnly: false, sort: "total" },
    tab: "list", // "list" | "compare"
    compareIds: [], // ids selecionados para comparar
  };

  const COMPARE_MAX = 5;
  // Paleta de séries (chapada, alternando lilás/verde e variações).
  const SERIES_COLORS = ["#b79cf0", "#7fe3a3", "#8fb9f0", "#f0c56b", "#f08a9b"];

  /* ---------- Carregamento dos dados ---------- */
  function loadData() {
    // 1) Resultado recém-gerado (fetch) tem prioridade.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    // 2) Dados embutidos pelo servidor.
    try {
      const el = $("cd-server-data");
      if (el) {
        const parsed = JSON.parse(el.textContent.trim());
        if (parsed) return parsed;
      }
    } catch (_) {}
    return null;
  }

  /* ---------- Normalização ---------- */
  function num(v, d = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function flatten(recommendations) {
    return (recommendations || []).map((entry, idx) => {
      const art = (entry && entry.article) || {};
      const d = art.article_data || {};
      const s = art.score_data || {};
      const g = d.genero || {};
      const authors = Array.isArray(d.authors) ? d.authors : [];
      const keywords = Array.isArray(d.keywords) ? d.keywords : [];
      return {
        id: d.openalex_id || d.doi || `rec-${idx}`,
        title: d.title || "Título não informado",
        authors,
        year: d.year || null,
        abstract: d.abstract || "",
        url: d.url || d.doi || null,
        citations: num(d.cited_by_count),
        keywords,
        openAccess: !!d.open_access,
        topics: Array.isArray(d.topics_origin) ? d.topics_origin : [],
        gender: {
          female: num(g.female_percentage),
          male: num(g.male_percentage),
          unknown: num(g.unknown_percentage),
          total: num(g.total),
          femaleCount: num(g.female_count),
          available: !!g.disponivel,
          authors: Array.isArray(g.authors) ? g.authors : [],
        },
        score: {
          total: num(s.total),
          similarity: num(s.similarity),
          importance: num(s.importance),
          present: num(s.present),
          relevance: num(s.relevance),
          genre: num(s.genre_compose),
          correction: s.correction || {},
        },
        abnt: buildAbnt(authors, d.title, d.year),
      };
    });
  }

  function buildAbnt(authors, title, year) {
    const names = (authors || [])
      .map((n) => {
        const parts = String(n).trim().split(/\s+/);
        if (parts.length < 2) return String(n).toUpperCase();
        const last = parts.pop();
        return `${last.toUpperCase()}, ${parts.map((p) => p[0]).join(". ")}.`;
      })
      .join("; ");
    return `${names || "AUTORIA NÃO INFORMADA"} ${title || ""}. ${year || "s.d."}.`.trim();
  }

  /* ---------- Filtro / ordenação ---------- */
  function visible() {
    let list = state.items.slice();
    if (state.filters.femaleOnly)
      list = list.filter((i) => i.gender.female >= 100);
    const by = state.filters.sort;
    const sorters = {
      total: (a, b) => b.score.total - a.score.total,
      similarity: (a, b) => b.score.similarity - a.score.similarity,
      female: (a, b) => b.gender.female - a.gender.female,
      year: (a, b) => (b.year || 0) - (a.year || 0),
      citations: (a, b) => b.citations - a.citations,
    };
    list.sort(sorters[by] || sorters.total);
    return list;
  }

  /* ---------- Render: grade de cards ---------- */
  function render() {
    const list = visible();
    const grid = $("cd-grid");
    const hasItems = state.items.length > 0;

    // Fonte única de verdade sobre a visibilidade dos blocos.
    $("cd-empty").hidden = hasItems;
    $("cd-source").hidden = !hasItems;
    $("cd-controls").hidden = !hasItems;
    $("cd-tabs").hidden = !hasItems;

    if (!hasItems) {
      grid.innerHTML = "";
      $("cd-view-list").hidden = true;
      $("cd-view-compare").hidden = true;
      return;
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="cd-state" style="grid-column:1/-1">
          <span class="cd-state__icon cd-state__icon--empty"><i class="fa-solid fa-filter-circle-xmark"></i></span>
          <p class="cd-state__title">Nenhum artigo com esse filtro</p>
          <p class="cd-state__desc">Desative o filtro de autoria 100% feminina para ver mais recomendações.</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(card).join("");
  }

  function meterGender(g) {
    return `
      <div class="cd-meter">
        <span style="width:${g.female}%;background:var(--cd-purple)"></span>
        <span style="width:${g.male}%;background:var(--cd-green)"></span>
        <span style="width:${g.unknown}%;background:var(--cd-line)"></span>
      </div>`;
  }

  function card(it) {
    const saved = Shared.isSaved(it.id);
    const femaleBadge =
      it.gender.female >= 100
        ? '<span class="cd-badge cd-badge--purple"><i class="fa-solid fa-venus"></i> Autoria 100% feminina</span>'
        : `<span class="cd-badge cd-badge--purple"><i class="fa-solid fa-venus"></i> ${Math.round(it.gender.female)}% feminina</span>`;
    const kw = it.keywords
      .slice(0, 4)
      .map((k) => `<span class="cd-chip cd-truncate">${esc(k)}</span>`)
      .join("");

    return `
      <article class="cd-rec cd-card cd-card--hover">
        <div class="cd-rec__top">
          <span class="cd-stamp"><i class="fa-solid fa-star"></i> ${Math.round(it.score.total)} pts</span>
          <button type="button" class="cd-rec__save ${saved ? "is-saved" : ""}" data-cd-save="${esc(it.id)}" aria-label="Salvar citação">
            <i class="fa-${saved ? "solid" : "regular"} fa-bookmark"></i>
          </button>
        </div>

        <h3 class="cd-rec__title cd-break cd-clamp-2">${esc(it.title)}</h3>
        <p class="cd-rec__authors cd-break cd-clamp-1">
          <i class="fa-solid fa-user-graduate"></i>
          ${esc(it.authors.join(", ") || "Autoria não informada")}
        </p>

        <div class="cd-rec__tags">
          ${femaleBadge}
          ${it.year ? `<span class="cd-badge">${it.year}</span>` : ""}
          <span class="cd-badge"><i class="fa-solid fa-quote-right"></i> ${it.citations}</span>
          ${it.openAccess ? '<span class="cd-badge cd-badge--green"><i class="fa-solid fa-lock-open"></i> Aberto</span>' : ""}
        </div>

        <p class="cd-rec__abstract cd-break cd-clamp-3">${esc(it.abstract || "Resumo não disponível.")}</p>

        <div class="cd-rec__meters">
          <div class="cd-rec__meter">
            <div class="cd-rec__meter-head"><span>Similaridade</span><strong>${Math.round(it.score.similarity)}%</strong></div>
            <div class="cd-meter"><span style="width:${it.score.similarity}%;background:var(--cd-green)"></span></div>
          </div>
          <div class="cd-rec__meter">
            <div class="cd-rec__meter-head"><span>Composição de autoria</span><strong>${Math.round(it.gender.female)}%</strong></div>
            ${meterGender(it.gender)}
          </div>
        </div>

        ${kw ? `<div class="cd-rec__chips">${kw}</div>` : ""}

        <div class="cd-rec__foot">
          <button type="button" class="cd-btn cd-btn--soft cd-btn--sm" data-cd-copy="${esc(it.id)}">
            <i class="fa-regular fa-copy"></i> Copiar ABNT
          </button>
          <button type="button" class="cd-btn cd-btn--primary cd-btn--sm" data-cd-detail="${esc(it.id)}">
            Análise completa <i class="fa-solid fa-arrow-right-long"></i>
          </button>
        </div>
      </article>`;
  }

  /* ---------- Detalhe (drawer) ---------- */
  function scoreRow(label, value, color) {
    return `
      <div class="cd-score-row">
        <div class="cd-score-row__head"><span>${label}</span><strong>${Math.round(value)}</strong></div>
        <div class="cd-meter"><span style="width:${Math.min(100, value)}%;background:${color}"></span></div>
      </div>`;
  }

  function evidenceBlock(correction) {
    const ev = Array.isArray(correction.evidence) ? correction.evidence : [];
    if (ev.length === 0) return "";
    return `
      <div class="cd-detail-block">
        <h4><i class="fa-solid fa-quote-left"></i> Evidências no resumo</h4>
        ${ev
          .map(
            (e) => `
          <blockquote class="cd-evidence">
            <p class="cd-evidence__quote cd-serif cd-break">“${esc(e.quote || "")}”</p>
            <p class="cd-evidence__why cd-break">${esc(e.relevance || "")}</p>
          </blockquote>`,
          )
          .join("")}
      </div>`;
  }

  function usingBlock(correction) {
    const using = Array.isArray(correction.using) ? correction.using : [];
    if (using.length === 0) return "";
    return `
      <div class="cd-detail-block">
        <h4><i class="fa-solid fa-location-dot"></i> Onde citar no seu texto</h4>
        ${using
          .map((u) => {
            const loc = [];
            if (u.page != null) loc.push(`pág. ${u.page}`);
            if (u.line != null) loc.push(`linha ${u.line}`);
            if (u.paragraph_id != null) loc.push(`parágrafo ${u.paragraph_id}`);
            return `
            <div class="cd-wherecite">
              <div class="cd-wherecite__head">
                <span class="cd-badge cd-badge--green">${esc(u.citation_function || "citação")}</span>
                ${loc.length ? `<span class="cd-wherecite__loc">${esc(loc.join(" · "))}</span>` : ""}
              </div>
              ${u.anchor_quote ? `<p class="cd-wherecite__anchor cd-serif cd-break">“${esc(u.anchor_quote)}”</p>` : ""}
              <p class="cd-wherecite__reason cd-break">${esc(u.reason || "")}</p>
            </div>`;
          })
          .join("")}
      </div>`;
  }

  function genderBlock(it) {
    const g = it.gender;
    if (!g.available) {
      return `<p class="cd-detail-note">Estimativa de gênero indisponível para este artigo.</p>`;
    }
    const authors = g.authors
      .map((a) => {
        const prob =
          a.probability != null ? ` · ${Math.round(a.probability * 100)}%` : "";
        const icon = a.is_female
          ? '<i class="fa-solid fa-venus" style="color:var(--cd-purple)"></i>'
          : a.gender === "male"
            ? '<i class="fa-solid fa-mars" style="color:var(--cd-green)"></i>'
            : '<i class="fa-solid fa-question" style="color:var(--cd-text-dim)"></i>';
        return `<li>${icon} <span class="cd-break">${esc(a.name || "")}</span><span class="cd-gender-prob">${prob}</span></li>`;
      })
      .join("");
    return `
      <div class="cd-gender-summary">
        ${meterGender(g)}
        <div class="cd-gender-legend">
          <span><i class="fa-solid fa-square" style="color:var(--cd-purple)"></i> Feminino ${Math.round(g.female)}%</span>
          <span><i class="fa-solid fa-square" style="color:var(--cd-green)"></i> Masculino ${Math.round(g.male)}%</span>
          <span><i class="fa-solid fa-square" style="color:var(--cd-line)"></i> Indefinido ${Math.round(g.unknown)}%</span>
        </div>
      </div>
      ${authors ? `<ul class="cd-gender-list">${authors}</ul>` : ""}`;
  }

  function openDetail(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    const c = it.score.correction || {};

    $("cd-detail-score").innerHTML =
      `<i class="fa-solid fa-star"></i> ${Math.round(it.score.total)} pts`;
    $("cd-detail-title").textContent = it.title;

    $("cd-detail-body").innerHTML = `
      <p class="cd-detail-authors cd-break">
        <i class="fa-solid fa-user-graduate"></i> ${esc(it.authors.join(", ") || "Autoria não informada")}
        ${it.year ? ` · ${it.year}` : ""}
      </p>

      <div class="cd-detail-actions">
        ${it.url ? `<a class="cd-btn cd-btn--soft cd-btn--sm" href="${esc(it.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> Abrir artigo</a>` : ""}
        <button type="button" class="cd-btn cd-btn--purple cd-btn--sm" data-cd-copy="${esc(it.id)}"><i class="fa-regular fa-copy"></i> Copiar ABNT</button>
      </div>

      <div class="cd-detail-block">
        <h4><i class="fa-solid fa-chart-simple"></i> Composição da pontuação</h4>
        ${scoreRow("Similaridade", it.score.similarity, "var(--cd-green)")}
        ${scoreRow("Importância", it.score.importance, "var(--cd-purple)")}
        ${scoreRow("Relevância", it.score.relevance, "var(--cd-green)")}
        ${scoreRow("Atualidade", it.score.present, "var(--cd-purple)")}
        ${scoreRow("Composição de gênero", it.score.genre, "var(--cd-green)")}
      </div>

      <div class="cd-detail-block">
        <h4><i class="fa-solid fa-venus-mars"></i> Autoria estimada</h4>
        ${genderBlock(it)}
      </div>

      ${
        c.justification
          ? `<div class="cd-detail-block"><h4><i class="fa-solid fa-scale-balanced"></i> Avaliação de relevância</h4>
             <p class="cd-break">${esc(c.justification)}</p>
             ${c.uncertainty ? `<span class="cd-badge cd-badge--muted">Incerteza: ${esc(c.uncertainty)}</span>` : ""}</div>`
          : ""
      }

      ${evidenceBlock(c)}
      ${usingBlock(c)}

      ${
        it.abstract
          ? `<div class="cd-detail-block"><h4><i class="fa-solid fa-align-left"></i> Resumo</h4><p class="cd-break">${esc(it.abstract)}</p></div>`
          : ""
      }`;

    const drawer = $("cd-detail");
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    document.addEventListener("keydown", onEsc);
  }

  function closeDetail() {
    const drawer = $("cd-detail");
    drawer.classList.remove("is-open");
    document.removeEventListener("keydown", onEsc);
    setTimeout(() => (drawer.hidden = true), 280);
  }
  function onEsc(e) {
    if (e.key === "Escape") closeDetail();
  }

  /* ---------- Ações ---------- */
  function copyAbnt(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    navigator.clipboard
      .writeText(it.abnt)
      .then(() => Shared.toast("Citação ABNT copiada."))
      .catch(() => Shared.toast("Não foi possível copiar.", "error"));
  }

  function toggleSave(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    Shared.toggleSaved({
      id: it.id,
      title: it.title,
      author: it.authors.join(", "),
      citation: it.abnt,
    });
    render();
  }

  function onGridClick(e) {
    const save = e.target.closest("[data-cd-save]");
    if (save) return toggleSave(save.getAttribute("data-cd-save"));
    const copy = e.target.closest("[data-cd-copy]");
    if (copy) return copyAbnt(copy.getAttribute("data-cd-copy"));
    const detail = e.target.closest("[data-cd-detail]");
    if (detail) return openDetail(detail.getAttribute("data-cd-detail"));
  }

  /* ====================== ABAS (lista x comparativo) ====================== */
  function setTab(tab) {
    state.tab = tab;
    $("cd-view-list").hidden = tab !== "list";
    $("cd-view-compare").hidden = tab !== "compare";
    ["list", "compare"].forEach((t) => {
      const btn = $(`cd-tab-${t}`);
      if (!btn) return;
      const on = t === tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    if (tab === "compare") renderCompare();
  }

  /* ====================== COMPARATIVO (Chart.js) ====================== */
  const charts = {}; // instâncias Chart.js por canvas id

  function colorForId(id) {
    const i = state.compareIds.indexOf(id);
    return SERIES_COLORS[i % SERIES_COLORS.length];
  }

  function shortLabel(it) {
    const t = it.title || "Sem título";
    return t.length > 42 ? t.slice(0, 40) + "…" : t;
  }

  function renderPicker() {
    const box = $("cd-compare-pick");
    box.innerHTML = state.items
      .map((it) => {
        const on = state.compareIds.includes(it.id);
        const dot = on ? `background:${colorForId(it.id)}` : "";
        return `
        <label class="cd-pick ${on ? "is-on" : ""}" title="${esc(it.title)}">
          <input type="checkbox" data-cd-pick="${esc(it.id)}" ${on ? "checked" : ""} />
          <span class="cd-pick__dot" style="${dot}"></span>
          <span class="cd-pick__label">${esc(shortLabel(it))}</span>
        </label>`;
      })
      .join("");
  }

  function selectedItems() {
    // Mantém a ordem de seleção (define a cor das séries).
    return state.compareIds
      .map((id) => state.items.find((x) => x.id === id))
      .filter(Boolean);
  }

  function togglePick(id) {
    const i = state.compareIds.indexOf(id);
    if (i > -1) {
      state.compareIds.splice(i, 1);
    } else {
      if (state.compareIds.length >= COMPARE_MAX) {
        Shared.toast(`Compare no máximo ${COMPARE_MAX} artigos.`, "error");
        renderPicker();
        return;
      }
      state.compareIds.push(id);
    }
    renderPicker();
    renderCompare();
  }

  function destroyCharts() {
    Object.keys(charts).forEach((k) => {
      if (charts[k]) {
        charts[k].destroy();
        delete charts[k];
      }
    });
  }

  const GRID = "rgba(255,255,255,0.08)";
  const TICK = "#8f87a8";

  function baseScales(maxTo100) {
    return {
      r: undefined,
      x: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 11 } } },
      y: {
        beginAtZero: true,
        suggestedMax: maxTo100 ? 100 : undefined,
        grid: { color: GRID },
        ticks: { color: TICK, font: { size: 11 } },
      },
    };
  }

  function legendOpts(show) {
    return {
      display: show,
      labels: { color: "#c6bedd", font: { size: 11 }, usePointStyle: true },
    };
  }

  function renderCompare() {
    renderPicker();
    const sel = selectedItems();
    const empty = sel.length === 0;
    $("cd-compare-empty").hidden = !empty;
    $("cd-compare-charts").hidden = empty;
    destroyCharts();
    if (empty) return;

    const labels = sel.map(shortLabel);
    const colors = sel.map((it) => colorForId(it.id));

    // 1) Radar: perfil das 5 dimensões de pontuação.
    const dims = [
      "Similaridade",
      "Importância",
      "Relevância",
      "Atualidade",
      "Autoria fem.",
    ];
    charts.radar = new Chart($("cd-chart-radar"), {
      type: "radar",
      data: {
        labels: dims,
        datasets: sel.map((it) => {
          const c = colorForId(it.id);
          return {
            label: shortLabel(it),
            data: [
              it.score.similarity,
              it.score.importance,
              it.score.relevance,
              it.score.present,
              it.gender.female,
            ],
            borderColor: c,
            backgroundColor: c + "33",
            pointBackgroundColor: c,
            borderWidth: 2,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: legendOpts(true) },
        scales: {
          r: {
            min: 0,
            max: 100,
            grid: { color: GRID },
            angleLines: { color: GRID },
            pointLabels: { color: "#c6bedd", font: { size: 11 } },
            ticks: {
              color: TICK,
              backdropColor: "transparent",
              font: { size: 9 },
            },
          },
        },
      },
    });

    // 2) Barra: pontuação final.
    charts.total = new Chart($("cd-chart-total"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Pontuação final",
            data: sel.map((it) => Math.round(it.score.total)),
            backgroundColor: colors,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: legendOpts(false) },
        scales: baseScales(true),
      },
    });

    // 3) Barra empilhada: composição de autoria (fem/masc/indef).
    charts.gender = new Chart($("cd-chart-gender"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Feminino",
            data: sel.map((it) => it.gender.female),
            backgroundColor: "#b79cf0",
            borderRadius: 4,
          },
          {
            label: "Masculino",
            data: sel.map((it) => it.gender.male),
            backgroundColor: "#7fe3a3",
            borderRadius: 4,
          },
          {
            label: "Indefinido",
            data: sel.map((it) => it.gender.unknown),
            backgroundColor: "#4a4360",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: legendOpts(true) },
        scales: {
          x: {
            stacked: true,
            grid: { color: GRID },
            ticks: { color: TICK, font: { size: 11 } },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            suggestedMax: 100,
            grid: { color: GRID },
            ticks: { color: TICK, font: { size: 11 } },
          },
        },
      },
    });

    // 4) Barra horizontal: citações recebidas.
    charts.citations = new Chart($("cd-chart-citations"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Citações",
            data: sel.map((it) => it.citations),
            backgroundColor: colors,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: legendOpts(false) },
        scales: baseScales(false),
      },
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const data = loadData();
    state.source = (data && data.source) || {};
    state.items = flatten(data && data.recommendations);

    // Preenche o texto do cabeçalho; a visibilidade é decidida em render().
    if (state.items.length > 0) {
      $("cd-source-title").textContent =
        state.source.title || "Manuscrito analisado";
      $("cd-source-summary").textContent = state.source.summary || "";
      $("cd-source-area").textContent = state.source.research_area || "—";
      $("cd-source-count").textContent = String(state.items.length);
      // Pré-seleciona os primeiros artigos (já ordenados por pontuação) para comparar.
      state.compareIds = visible()
        .slice(0, Math.min(3, COMPARE_MAX))
        .map((it) => it.id);
    }

    render();

    $("cd-grid").addEventListener("click", onGridClick);
    $("cd-detail-body").addEventListener("click", onGridClick);

    // Abas
    $("cd-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cd-tab]");
      if (btn) setTab(btn.getAttribute("data-cd-tab"));
    });

    // Seleção de artigos para comparar
    $("cd-compare-pick").addEventListener("change", (e) => {
      const chk = e.target.closest("[data-cd-pick]");
      if (chk) togglePick(chk.getAttribute("data-cd-pick"));
    });

    $("cd-sort").addEventListener("change", (e) => {
      state.filters.sort = e.target.value;
      render();
    });
    $("cd-f-female").addEventListener("change", (e) => {
      state.filters.femaleOnly = e.target.checked;
      render();
    });

    $("cd-detail").addEventListener("click", (e) => {
      if (e.target.closest("[data-cd-detail-close]")) closeDetail();
    });
  });

  window.CitaDelasResult = { closeDetail };
})();
