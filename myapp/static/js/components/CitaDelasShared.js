/* ============================================================
   CitaDelasShared — utilitários compartilhados entre as páginas
   Expõe window.CitaDelasShared com:
     toast(msg, type)        -> notificação
     escapeHtml(str)         -> sanitização para innerHTML
     getSaved() / saveItem() / removeSaved() / isSaved()
     toggleSavedDrawer()
   Persiste "citações salvas" em localStorage.
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "citadelas:saved";

  /* ---------- Estado persistido ---------- */
  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function writeStore(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* storage indisponível — degrada em silêncio */
    }
  }

  let saved = readStore();

  /* ---------- Utilidades ---------- */
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let toastTimer = null;
  function toast(message, type = "success") {
    const el = document.getElementById("cd-toast");
    const msgEl = document.getElementById("cd-toast-msg");
    const iconEl = document.getElementById("cd-toast-icon");
    if (!el || !msgEl) return;

    msgEl.textContent = message;
    el.classList.toggle("is-error", type === "error");
    if (iconEl) {
      iconEl.innerHTML =
        type === "error"
          ? '<i class="fa-solid fa-triangle-exclamation"></i>'
          : '<i class="fa-solid fa-check"></i>';
    }
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3200);
  }

  /* ---------- Citações salvas ---------- */
  function getSaved() {
    return [...saved];
  }
  function isSaved(id) {
    return saved.some((p) => p.id === id);
  }
  function saveItem(item) {
    if (!item || !item.id || isSaved(item.id)) return false;
    saved.push(item);
    writeStore(saved);
    syncCounter();
    renderDrawer();
    return true;
  }
  function removeSaved(id) {
    saved = saved.filter((p) => p.id !== id);
    writeStore(saved);
    syncCounter();
    renderDrawer();
  }
  function toggleSaved(item) {
    if (isSaved(item.id)) {
      removeSaved(item.id);
      toast("Citação removida das suas citações.");
      return false;
    }
    saveItem(item);
    toast("Citação salva em Minhas citações.");
    return true;
  }

  function syncCounter() {
    const counter = document.getElementById("cd-saved-counter");
    if (counter) counter.textContent = String(saved.length);
  }

  /* ---------- Drawer ---------- */
  function renderDrawer() {
    const list = document.getElementById("cd-saved-list");
    if (!list) return;

    if (saved.length === 0) {
      list.innerHTML = `
        <div class="cd-state">
          <span class="cd-state__icon cd-state__icon--empty"><i class="fa-regular fa-bookmark"></i></span>
          <p class="cd-state__title">Nenhuma citação salva ainda</p>
          <p class="cd-state__desc">Ao analisar um artigo, salve as referências de autoras que quiser citar. Elas aparecem aqui e ficam guardadas neste navegador.</p>
        </div>`;
      return;
    }

    list.innerHTML = saved
      .map(
        (p) => `
        <div class="cd-saved-item">
          <h3 class="cd-saved-item__title cd-clamp-2 cd-break">${escapeHtml(p.title)}</h3>
          <p class="cd-saved-item__author cd-clamp-1 cd-break">${escapeHtml(p.author || "Autoria não informada")}</p>
          <p class="cd-saved-item__cite cd-clamp-3 cd-break">${escapeHtml(p.citation || "")}</p>
          <button type="button" class="cd-saved-item__remove" data-cd-remove="${escapeHtml(p.id)}">
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Remover
          </button>
        </div>`
      )
      .join("");
  }

  function openDrawer() {
    const drawer = document.getElementById("cd-saved-drawer");
    if (!drawer) return;
    renderDrawer();
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    document.addEventListener("keydown", onEsc);
  }
  function closeDrawer() {
    const drawer = document.getElementById("cd-saved-drawer");
    if (!drawer) return;
    drawer.classList.remove("is-open");
    document.removeEventListener("keydown", onEsc);
    setTimeout(() => {
      drawer.hidden = true;
    }, 280);
  }
  function toggleSavedDrawer() {
    const drawer = document.getElementById("cd-saved-drawer");
    if (!drawer) return;
    drawer.hidden ? openDrawer() : closeDrawer();
  }
  function onEsc(e) {
    if (e.key === "Escape") closeDrawer();
  }

  /* ---------- Bind global ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    syncCounter();

    const drawer = document.getElementById("cd-saved-drawer");
    if (drawer) {
      drawer.addEventListener("click", (e) => {
        if (e.target.closest("[data-cd-drawer-close]")) closeDrawer();
        const rm = e.target.closest("[data-cd-remove]");
        if (rm) {
          removeSaved(rm.getAttribute("data-cd-remove"));
          toast("Citação removida das suas citações.");
        }
      });
    }
  });

  window.CitaDelasShared = {
    toast,
    escapeHtml,
    getSaved,
    isSaved,
    saveItem,
    removeSaved,
    toggleSaved,
    toggleSavedDrawer,
  };
})();
