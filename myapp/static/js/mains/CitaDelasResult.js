/* ============================================================
   CitaDelasResult — orquestra as três views do painel:
   recomendações (lista + filtros), comparar (gráficos) e
   onde citar (documento + locais sugeridos).
   Estado agrupado; dados via window.CitaDelasData;
   gráficos via window.CitaDelasCharts.
   ============================================================ */
(function () {
  "use strict";

  const Shared = window.CitaDelasShared;
  const Data = window.CitaDelasData;
  const Charts = window.CitaDelasCharts;
  const $ = (id) => document.getElementById(id);

  const CITE_COLORS = {
    terracotta: { solid: "#e0653a", soft: "rgba(224,101,58,.16)", mark: "rgba(224,101,58,.32)" },
    brick: { solid: "#d94a5a", soft: "rgba(217,74,90,.16)", mark: "rgba(217,74,90,.32)" },
    gold: { solid: "#d9a52b", soft: "rgba(217,165,43,.18)", mark: "rgba(217,165,43,.4)" },
    teal: { solid: "#3a9a8c", soft: "rgba(58,154,140,.18)", mark: "rgba(58,154,140,.34)" },
  };

  const METRICS = ["similarity", "problem_fit", "freshness", "openalex_relevance", "reliability"];

  /* ---------- Estado único ---------- */
  const state = {
    view: "results",
    filters: { search: "", openAccess: false, female: false, minYear: 2020, sort: "score" },
    selected: [],
    chartTypes: { similarity: "radar", problem_fit: "doughnut", freshness: "bar", openalex_relevance: "polarArea", reliability: "doughnut" },
    pdfPage: 1,
    activeCitation: null,
  };

  /* ====================== VIEWS ====================== */
  function switchView(view) {
    state.view = view;
    ["results", "compare", "pdf"].forEach((v) => {
      $(`cd-view-${v}`).hidden = v !== view;
      const btn = $(`cd-vt-${v}`);
      btn.classList.toggle("is-active", v === view);
      btn.setAttribute("aria-selected", String(v === view));
    });
    if (view === "compare") {
      renderSelectors();
      renderCharts();
    }
  }

  /* ====================== RECOMENDAÇÕES ====================== */
  function onYearInput(value) {
    $("cd-f-year-val").textContent = value;
    state.filters.minYear = Number(value);
    applyFilters();
  }

  function readFilters() {
    state.filters.search = $("cd-f-search").value.toLowerCase().trim();
    state.filters.openAccess = $("cd-f-oa").checked;
    state.filters.female = $("cd-f-female").checked;
    state.filters.sort = $("cd-r-sort").value;
  }

  function resetFilters() {
    $("cd-f-search").value = "";
    $("cd-f-oa").checked = false;
    $("cd-f-female").checked = false;
    $("cd-f-year").value = 2018;
    $("cd-f-year-val").textContent = "2018";
    $("cd-r-sort").value = "score";
    state.filters = { search: "", openAccess: false, female: false, minYear: 2018, sort: "score" };
    applyFilters();
  }

  function filteredList() {
    const f = state.filters;
    let list = Data.recommendations.filter((item) => {
      const hay = [item.title, item.summary, item.authors.join(" "), item.keywords.join(" ")].join(" ").toLowerCase();
      const matchSearch = !f.search || hay.includes(f.search);
      const matchOA = !f.openAccess || item.openAccess;
      const matchFemale = !f.female || item.gender.women === 100;
      const matchYear = item.year >= f.minYear;
      return matchSearch && matchOA && matchFemale && matchYear;
    });
    if (f.sort === "year") list.sort((a, b) => b.year - a.year);
    else if (f.sort === "citations") list.sort((a, b) => b.citations - a.citations);
    else list.sort((a, b) => b.match - a.match);
    return list;
  }

  function applyFilters() {
    readFilters();
    const list = filteredList();
    $("cd-r-count").textContent = String(list.length);
    renderRecommendations(list);
  }

  function renderRecommendations(items) {
    const container = $("cd-reclist");
    if (items.length === 0) {
      container.innerHTML = `
        <div class="cd-state">
          <span class="cd-state__icon cd-state__icon--empty"><i class="fa-solid fa-filter-circle-xmark"></i></span>
          <p class="cd-state__title">Nenhuma recomendação com esses filtros</p>
          <p class="cd-state__desc">Tente ampliar o período, remover filtros ou revisar o termo buscado.</p>
        </div>`;
      return;
    }
    container.innerHTML = items.map(recCard).join("");
  }

  function recCard(item) {
    const saved = Shared.isSaved(item.id);
    return `
      <article class="cd-rec">
        <div class="cd-rec__top">
          <div class="cd-rec__badges">
            <span class="cd-stamp"><i class="fa-solid fa-bullseye" aria-hidden="true"></i> ${item.match}% match</span>
            ${item.openAccess ? '<span class="cd-badge cd-badge--ok"><i class="fa-solid fa-lock-open"></i> Acesso aberto</span>' : ""}
            <span class="cd-badge">${item.year}</span>
            ${item.gender.women === 100 ? '<span class="cd-badge cd-badge--brand"><i class="fa-solid fa-venus"></i> 100% feminina</span>' : ""}
          </div>
          <span class="cd-badge cd-badge--gold"><i class="fa-solid fa-quote-right"></i> ${item.citations} citações</span>
        </div>

        <div>
          <h2 class="cd-rec__title cd-break cd-clamp-2">${Shared.escapeHtml(item.title)}</h2>
          <p class="cd-rec__author cd-break cd-clamp-1">
            <i class="fa-solid fa-user-graduate" aria-hidden="true"></i>
            <span class="cd-truncate">${Shared.escapeHtml(item.authors.join(" · "))} · ${Shared.escapeHtml(item.institution)}</span>
          </p>
        </div>

        <p class="cd-rec__abstract cd-break cd-clamp-3">${Shared.escapeHtml(item.summary)}</p>

        <div class="cd-rec__meters">
          <div>
            <div class="cd-rec__meter-head"><span>Match de conteúdo</span><span style="color:#f0a583">${item.match}%</span></div>
            <div class="cd-meter cd-meter--brand"><span style="width:${item.match}%"></span></div>
          </div>
          <div>
            <div class="cd-rec__meter-head"><span>Autoria feminina</span><span style="color:var(--cd-gold)">${item.gender.women}%</span></div>
            <div class="cd-meter"><span style="width:${item.gender.women}%;background:var(--cd-gold)"></span><span style="width:${item.gender.men}%;background:var(--cd-line)"></span></div>
          </div>
        </div>

        <div class="cd-rec__tags">
          ${item.keywords.map((k) => `<span class="cd-tag-sm cd-truncate">#${Shared.escapeHtml(k)}</span>`).join("")}
        </div>

        <div class="cd-rec__foot">
          <button type="button" class="cd-rec__save ${saved ? "is-saved" : ""}" data-cd-save="${item.id}">
            <i class="fa-${saved ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i>
            <span>${saved ? "Salva" : "Salvar"}</span>
          </button>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="button" class="cd-btn cd-btn--soft cd-btn--sm" data-cd-copy="${item.id}"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar ABNT</button>
            <button type="button" class="cd-btn cd-btn--primary cd-btn--sm" data-cd-detail="${item.id}">Análise completa <i class="fa-solid fa-arrow-right-long" aria-hidden="true"></i></button>
          </div>
        </div>
      </article>`;
  }

  function handleRecClick(e) {
    const save = e.target.closest("[data-cd-save]");
    if (save) {
      const item = Data.recommendations.find((r) => r.id === save.getAttribute("data-cd-save"));
      if (item) {
        Shared.toggleSaved({ id: item.id, title: item.title, author: item.authors.join(", "), citation: item.abnt });
        applyFilters();
      }
      return;
    }
    const copy = e.target.closest("[data-cd-copy]");
    if (copy) {
      const item = Data.recommendations.find((r) => r.id === copy.getAttribute("data-cd-copy"));
      if (item) {
        navigator.clipboard.writeText(item.abnt).then(() => Shared.toast("Citação ABNT copiada.")).catch(() => Shared.toast("Não foi possível copiar.", "error"));
      }
      return;
    }
    const detail = e.target.closest("[data-cd-detail]");
    if (detail) openDetail(detail.getAttribute("data-cd-detail"));
  }

  /* ====================== DETALHE (drawer) ====================== */
  function openDetail(id) {
    const item = Data.recommendations.find((r) => r.id === id);
    if (!item) return;

    $("cd-detail-id").textContent = item.id;
    $("cd-detail-title").textContent = item.title;
    $("cd-detail-body").innerHTML = `
      <div class="cd-detail-box">
        <div class="cd-detail-block" style="margin-bottom:10px">
          <h4><i class="fa-solid fa-venus-mars"></i> Composição das autorias</h4>
        </div>
        <div class="cd-detail-pie"><canvas id="cd-detail-pie-canvas"></canvas></div>
      </div>
      <div class="cd-detail-block">
        <h4>Resumo</h4>
        <p class="cd-break">${Shared.escapeHtml(item.summary)}</p>
      </div>
      <div class="cd-detail-block">
        <h4>Objetivo da pesquisa</h4>
        <p class="cd-break">${Shared.escapeHtml(item.objective)}</p>
      </div>
      <div class="cd-detail-block">
        <h4><i class="fa-solid fa-tags"></i> Tópicos mapeados</h4>
        ${item.topics.map((t) => `
          <div class="cd-detail-topic">
            <div class="cd-detail-topic__top">
              <strong style="font-size:.8rem;color:#f0a583" class="cd-break">${Shared.escapeHtml(t.title)}</strong>
              <span class="cd-badge">${Shared.escapeHtml(t.role)}</span>
            </div>
            <p style="margin:0;font-size:.78rem;color:var(--cd-text-muted)" class="cd-break">${Shared.escapeHtml(t.desc)}</p>
            <div class="cd-rec__tags">${t.keywords.map((k) => `<span class="cd-tag-sm">#${Shared.escapeHtml(k)}</span>`).join("")}</div>
          </div>`).join("")}
      </div>
      <div class="cd-detail-block">
        <h4><i class="fa-solid fa-book-bookmark"></i> Referências já citadas</h4>
        ${item.references.length === 0
          ? '<p style="font-style:italic;color:var(--cd-text-dim);font-size:.78rem">Nenhuma referência prévia cadastrada.</p>'
          : item.references.map((r) => `<div class="cd-detail-box" style="padding:11px"><p style="margin:0;font-size:.8rem;font-weight:600" class="cd-break">${Shared.escapeHtml(r.title)} (${r.year})</p><p style="margin:3px 0 0;font-size:.74rem;color:var(--cd-text-dim)">${Shared.escapeHtml(r.authors.join(", "))}</p></div>`).join("")}
      </div>`;

    const drawer = $("cd-detail-drawer");
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    Charts.genderDonut("cd-detail-pie-canvas", item.gender.women, item.gender.men);
    document.addEventListener("keydown", onDetailEsc);
  }
  function closeDetail() {
    const drawer = $("cd-detail-drawer");
    drawer.classList.remove("is-open");
    document.removeEventListener("keydown", onDetailEsc);
    setTimeout(() => {
      drawer.hidden = true;
      Charts.destroy("cd-detail-pie-canvas");
    }, 280);
  }
  function onDetailEsc(e) {
    if (e.key === "Escape") closeDetail();
  }

  /* ====================== COMPARAR ====================== */
  function renderSelectors() {
    const container = $("cd-selectors");
    container.innerHTML = Data.recommendations
      .map((item) => {
        const sel = state.selected.includes(item.id);
        return `
        <label class="cd-selector ${sel ? "is-selected" : ""}">
          <input type="checkbox" ${sel ? "checked" : ""} data-cd-select="${item.id}" />
          <span class="cd-truncate">${Shared.escapeHtml(item.shortLabel)}</span>
        </label>`;
      })
      .join("");
    $("cd-sel-counter").textContent = `${state.selected.length} de 3`;
  }

  function toggleSelect(id) {
    const i = state.selected.indexOf(id);
    if (i > -1) {
      state.selected.splice(i, 1);
    } else {
      if (state.selected.length >= 3) {
        Shared.toast("Selecione no máximo 3 pesquisas.", "error");
        renderSelectors();
        return;
      }
      state.selected.push(id);
    }
    renderSelectors();
    renderCharts();
  }

  function renderCharts() {
    const active = Data.recommendations.filter((r) => state.selected.includes(r.id));
    const empty = active.length === 0;
    $("cd-compare-empty").hidden = !empty;
    $("cd-charts").style.display = empty ? "none" : "grid";
    if (empty) return;

    const labels = active.map((r) => r.shortLabel);
    METRICS.forEach((m) => {
      const values = active.map((r) => r.metrics[m]);
      Charts.metricChart(`cd-chart-${m}`, state.chartTypes[m], labels, values);
      const top = [...active].sort((a, b) => b.metrics[m] - a.metrics[m])[0];
      const winnerEl = document.querySelector(`[data-winner="${m}"]`);
      if (winnerEl) winnerEl.textContent = `${top.shortLabel} (${top.metrics[m]}%)`;
    });
    Charts.genderStacked("cd-chart-gender", labels, active.map((r) => r.gender.women), active.map((r) => r.gender.men));
  }

  /* ====================== ONDE CITAR (PDF) ====================== */
  function renderPdf() {
    const doc = Data.document;
    $("cd-doc-title").textContent = doc.title;
    $("cd-doc-paper-title").textContent = doc.title;
    $("cd-doc-authors").textContent = doc.authors;
    $("cd-cite-count").textContent = `${doc.citations.length} ${doc.citations.length === 1 ? "local" : "locais"}`;
    renderPage(state.pdfPage);
    renderCitationCards();
  }

  function escapeReg(v) {
    return String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderPage(pageNumber) {
    const doc = Data.document;
    const page = doc.pages.find((p) => p.number === pageNumber);
    if (!page) return;
    state.pdfPage = pageNumber;

    $("cd-doc-content").innerHTML = page.paragraphs
      .map((par) => {
        let html = Shared.escapeHtml(par.text);
        doc.citations
          .filter((c) => c.page === pageNumber && c.paragraphId === par.id)
          .forEach((c) => {
            const color = CITE_COLORS[c.color] || CITE_COLORS.terracotta;
            const re = new RegExp(escapeReg(c.anchor), "gi");
            html = html.replace(re, (match) =>
              `<mark id="cd-anchor-${c.id}" class="cd-doc__mark" data-cd-focus="${c.id}" tabindex="0" role="button" style="background:${color.mark};box-shadow:inset 0 -2px 0 ${color.solid}" title="Ver justificativa">${match}</mark>`
            );
          });
        return `<p>${html}</p>`;
      })
      .join("");

    $("cd-doc-page").textContent = `Página ${pageNumber} de ${doc.pages.length}`;
  }

  function renderCitationCards() {
    $("cd-citation-cards").innerHTML = Data.document.citations
      .map((c) => {
        const color = CITE_COLORS[c.color] || CITE_COLORS.terracotta;
        return `
        <button type="button" id="cd-cite-card-${c.id}" class="cd-cite-card" data-cd-focus="${c.id}" style="border-left-color:${color.solid}">
          <div class="cd-cite-card__top">
            <span class="cd-cite-card__num" style="background:${color.solid}">${c.id.replace("C", "")}</span>
            <span class="cd-cite-card__label" style="color:${color.solid}">${Shared.escapeHtml(c.label)}</span>
            <span class="cd-cite-card__loc">Pág. ${c.page} · ${c.paragraphId}</span>
          </div>
          <h4>Onde inserir</h4>
          <p class="cd-cite-card__quote cd-break cd-clamp-3">"${Shared.escapeHtml(c.quote)}"</p>
          <div class="cd-cite-card__reason" style="background:${color.soft}">
            <span class="cd-cite-card__reason-k" style="color:${color.solid}"><i class="fa-solid fa-lightbulb"></i> Por que citar aqui</span>
            ${Shared.escapeHtml(c.reason)}
          </div>
        </button>`;
      })
      .join("");
  }

  function focusCitation(id) {
    const c = Data.document.citations.find((x) => x.id === id);
    if (!c) return;
    if (state.pdfPage !== c.page) {
      renderPage(c.page);
      $("cd-doc-scroll").scrollTo({ top: 0, behavior: "smooth" });
    }
    document.querySelectorAll(".cd-cite-card").forEach((el) => el.classList.remove("is-active"));
    $(`cd-cite-card-${id}`)?.classList.add("is-active");
    state.activeCitation = id;
    setTimeout(() => {
      const mark = $(`cd-anchor-${id}`);
      if (!mark) return;
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      mark.classList.add("is-pulse");
      setTimeout(() => mark.classList.remove("is-pulse"), 1400);
    }, 120);
  }

  function changePage(dir) {
    const next = state.pdfPage + dir;
    if (next < 1 || next > Data.document.pages.length) return;
    renderPage(next);
    $("cd-doc-scroll").scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ====================== BIND ====================== */
  document.addEventListener("DOMContentLoaded", () => {
    applyFilters();
    renderPdf();

    $("cd-reclist").addEventListener("click", handleRecClick);

    $("cd-selectors").addEventListener("change", (e) => {
      const chk = e.target.closest("[data-cd-select]");
      if (chk) toggleSelect(chk.getAttribute("data-cd-select"));
    });

    document.querySelectorAll("[data-chart-type]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        state.chartTypes[sel.getAttribute("data-chart-type")] = e.target.value;
        renderCharts();
      });
    });

    // Detalhe drawer
    const detail = $("cd-detail-drawer");
    detail.addEventListener("click", (e) => {
      if (e.target.closest("[data-cd-detail-close]")) closeDetail();
    });

    // Foco em citação (clique e teclado)
    const focusHandler = (e) => {
      const trigger = e.target.closest("[data-cd-focus]");
      if (!trigger) return;
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      focusCitation(trigger.getAttribute("data-cd-focus"));
    };
    $("cd-citation-cards").addEventListener("click", focusHandler);
    $("cd-doc-content").addEventListener("click", focusHandler);
    $("cd-doc-content").addEventListener("keydown", focusHandler);
  });

  window.CitaDelasResult = { switchView, applyFilters, resetFilters, onYearInput, changePage };
})();
