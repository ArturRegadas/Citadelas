/* ============================================================
   CitaDelasRecommend — página de envio do artigo.
   Envia o arquivo ao backend (/pdf/page) via fetch, mostra um
   overlay com etapas do pipeline, guarda o resultado em
   sessionStorage e navega para a página de recomendações.
   ============================================================ */
(function () {
  "use strict";

  const Shared = window.CitaDelasShared;
  const $ = (id) => document.getElementById(id);

  const RESULT_URL = "/citadelas/recomendacoes";
  const STORAGE_KEY = "citadelas:lastResult";

  const state = { file: null, busy: false };

  const STEPS = [
    "Analisando o contexto do artigo",
    "Buscando trabalhos relacionados no OpenAlex",
    "Estimando a autoria feminina por nome",
    "Pontuando e organizando as recomendações",
  ];

  /* ---------- Upload ---------- */
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
  }

  function clearFile() {
    state.file = null;
    $("cd-file-input").value = "";
    $("cd-file-info").hidden = true;
    $("cd-dropzone").classList.remove("is-drag");
  }

  /* ---------- Overlay ---------- */
  let stepTimer = null;
  function showOverlay() {
    const overlay = $("cd-overlay");
    overlay.hidden = false;
    let i = 0;
    $("cd-overlay-step").textContent = STEPS[0];
    clearInterval(stepTimer);
    stepTimer = setInterval(() => {
      i = (i + 1) % STEPS.length;
      $("cd-overlay-step").textContent = STEPS[i];
    }, 1600);
  }
  function hideOverlay() {
    clearInterval(stepTimer);
    $("cd-overlay").hidden = true;
  }

  function setBusy(busy) {
    state.busy = busy;
    const btn = $("cd-analyze");
    btn.classList.toggle("is-loading", busy);
    btn.disabled = busy;
    $("cd-analyze-label").textContent = busy
      ? "Analisando…"
      : "Analisar e recomendar";
  }

  /* ---------- Envio ---------- */
  async function submit() {
    if (state.busy) return;
    if (!state.file) {
      Shared.toast("Anexe o PDF ou TXT do artigo para continuar.", "error");
      return;
    }

    setBusy(true);
    showOverlay();

    const form = new FormData();
    form.append("pdf_file", state.file);

    try {
      const res = await fetch("/pdf/page", {
        method: "POST",
        headers: { "X-Requested-With": "fetch", Accept: "application/json" },
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        const msg =
          (data && data.error) || "Não foi possível concluir a análise.";
        throw new Error(msg);
      }

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_) {
        /* storage indisponível: a página de resultado mostra estado vazio */
      }

      window.location.href = RESULT_URL;
    } catch (err) {
      hideOverlay();
      setBusy(false);
      Shared.toast(
        err.message || "Falha na análise. Tente novamente.",
        "error",
      );
    }
  }

  /* ---------- Bind ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const dz = $("cd-dropzone");
    const input = $("cd-file-input");

    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => onFileSelected(e.target.files[0]));

    ["dragover", "dragenter"].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        dz.classList.add("is-drag");
      }),
    );
    ["dragleave", "drop"].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === "drop" && e.dataTransfer.files[0])
          onFileSelected(e.dataTransfer.files[0]);
        else if (!state.file) dz.classList.remove("is-drag");
      }),
    );

    $("cd-form").addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
  });

  window.CitaDelasRecommend = { clearFile };
})();
