/* ============================================================
   CitaDelasCharts — helpers de Chart.js com a paleta da marca.
   Encapsula criação/atualização para o painel de comparação e o
   donut de gênero, destruindo instâncias anteriores com segurança.
   ============================================================ */
(function () {
  "use strict";

  const PALETTE = [
    { bg: "rgba(224, 101, 58, 0.75)", border: "#e0653a" },
    { bg: "rgba(217, 165, 43, 0.75)", border: "#d9a52b" },
    { bg: "rgba(58, 154, 140, 0.75)", border: "#3a9a8c" },
  ];
  const GRID = "#2f291f";
  const TICK = "#968a75";
  const LEGEND = "#cfc4ae";

  const instances = {};

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function metricChart(canvasId, rawType, labels, values) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    let type = rawType;
    let indexAxis = "x";
    if (rawType === "horizontalBar") {
      type = "bar";
      indexAxis = "y";
    }
    const radial = type === "radar" || type === "doughnut" || type === "polarArea";

    const dataset = {
      data: values,
      backgroundColor: radial ? PALETTE.map((c) => c.bg) : PALETTE[0].bg,
      borderColor: radial ? PALETTE.map((c) => c.border) : PALETTE[0].border,
      borderWidth: radial ? 1.5 : 1,
      borderRadius: type === "bar" ? 6 : 0,
      fill: type === "line",
      tension: 0.3,
    };

    const linearScale = { beginAtZero: true, max: 100, ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } };
    const catScale = { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } };

    let scales;
    if (radial) {
      scales = type === "radar" ? { r: { angleLines: { color: GRID }, grid: { color: GRID }, pointLabels: { color: TICK, font: { size: 9 } }, ticks: { display: false } } } : {};
    } else {
      scales = { x: indexAxis === "y" ? linearScale : catScale, y: indexAxis === "y" ? catScale : linearScale };
    }

    instances[canvasId] = new Chart(canvas.getContext("2d"), {
      type,
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis,
        plugins: { legend: { display: radial, labels: { color: LEGEND, font: { size: 10 } } } },
        scales,
      },
    });
  }

  function genderStacked(canvasId, labels, women, men) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    instances[canvasId] = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Mulheres (%)", data: women, backgroundColor: "#e0653a", borderRadius: 6 },
          { label: "Homens (%)", data: men, backgroundColor: "#3d3427", borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } },
          y: { stacked: true, max: 100, ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } },
        },
        plugins: { legend: { labels: { color: LEGEND, font: { size: 11 } } } },
      },
    });
  }

  function genderDonut(canvasId, women, men) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    instances[canvasId] = new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Mulheres", "Homens"],
        datasets: [{ data: [women, men], backgroundColor: ["#e0653a", "#3d3427"], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: { legend: { position: "bottom", labels: { color: LEGEND, font: { size: 11 } } } },
      },
    });
  }

  window.CitaDelasCharts = { metricChart, genderStacked, genderDonut, destroy };
})();
