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
  };

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

    if (state.items.length === 0) {
      $("cd-empty").hidden = false;
      $("cd-source").hidden = true;
      $("cd-controls").hidden = true;
      grid.innerHTML = "";
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

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const data = loadData();
    state.source = (data && data.source) || {};
    state.items = flatten(data && data.recommendations);

    // Cabeçalho da pesquisa
    if (state.items.length > 0) {
      $("cd-source").hidden = false;
      $("cd-controls").hidden = false;
      $("cd-empty").hidden = true;
      $("cd-source-title").textContent =
        state.source.title || "Manuscrito analisado";
      $("cd-source-summary").textContent = state.source.summary || "";
      $("cd-source-area").textContent = state.source.research_area || "—";
      $("cd-source-count").textContent = String(state.items.length);
    }

    render();

    $("cd-grid").addEventListener("click", onGridClick);
    $("cd-detail-body").addEventListener("click", onGridClick);

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
