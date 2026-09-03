const $ = (selector) => document.querySelector(selector);

const form = $("#search-form");
const queryInput = $("#query");
const submitButton = $("#submit-button");
const emptyState = $("#empty-state");
const loadingState = $("#loading-state");
const errorState = $("#error-state");
const resultContent = $("#result-content");
const candidateList = $("#candidate-list");
const emergencyBanner = $("#emergency-banner");

const urgencyLabels = {
  low: "Không gấp",
  moderate: "Nên đi khám",
  moderate_to_high: "Cần khám sớm",
  high: "Khẩn",
  emergency: "Cấp cứu",
  unknown: "Chưa phân loại",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setView(view) {
  emptyState.hidden = view !== "empty";
  loadingState.hidden = view !== "loading";
  errorState.hidden = view !== "error";
  resultContent.hidden = view !== "results";
}

function setEmergency(emergency) {
  const active = Boolean(emergency?.is_emergency);
  emergencyBanner.hidden = !active;
  document.body.classList.toggle("emergency-active", active);
  queryInput.disabled = active;
  submitButton.disabled = active;
  if (active) {
    $("#emergency-message").textContent = emergency.message;
    emergencyBanner.style.display = "flex";
  } else {
    emergencyBanner.style.removeProperty("display");
  }
}

function technicalScores(candidate) {
  const dense = candidate.dense_score == null ? "—" : Number(candidate.dense_score).toFixed(4);
  const bm25 = candidate.bm25_score == null ? "—" : Number(candidate.bm25_score).toFixed(4);
  return `<span class="technical-score" hidden>Final ${Number(candidate.score).toFixed(4)} · Dense ${dense} · BM25 ${bm25}</span>`;
}

function renderCandidate(candidate) {
  const symptoms = candidate.symptoms.length
    ? `<div class="chips">${candidate.symptoms.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>`
    : "";
  const description = candidate.description
    ? `<p class="candidate-description">${escapeHtml(candidate.description)}</p>`
    : "";
  const urgency = urgencyLabels[candidate.urgency] || candidate.urgency;
  return `
    <li class="candidate-card">
      <div class="candidate-top">
        <div class="candidate-name">
          <span class="rank">${candidate.rank}</span>
          <div><h3>${escapeHtml(candidate.name)}</h3><span class="candidate-id">${escapeHtml(candidate.disease_id)} · Tier ${candidate.tier}</span></div>
        </div>
        <span class="fit">${escapeHtml(candidate.fit_label)}</span>
      </div>
      ${description}
      ${symptoms}
      <div class="candidate-footer">
        <span>${escapeHtml(candidate.category)}</span>
        <span class="urgency urgency-${escapeHtml(candidate.urgency)}">Mức khẩn: ${escapeHtml(urgency)}</span>
        ${technicalScores(candidate)}
      </div>
    </li>`;
}

function toggleTechnicalScores(show) {
  document.querySelectorAll(".technical-score").forEach((item) => { item.hidden = !show; });
  $("#technical-note").hidden = !show;
  $("#technical-toggle").setAttribute("aria-expanded", String(show));
  $("#technical-toggle").textContent = show ? "Ẩn điểm kỹ thuật" : "Điểm kỹ thuật";
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("status unavailable");
    const status = await response.json();
    $("#model-release").textContent = status.model_release;
    $("#kb-count").textContent = `${status.knowledge_base_files} mục`;
    const index = status.vector_index;
    const stateText = index?.state === "ready"
      ? (status.model_loaded ? "Model đã nạp" : "Index sẵn sàng")
      : `Index ${index?.count || 0}/${index?.target || status.knowledge_base_files}`;
    $("#model-state").innerHTML = `<i></i> ${stateText}`;
  } catch (_) {
    $("#kb-count").textContent = "Không đọc được";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (query.length < 2) return;

  setEmergency(null);
  setView("loading");
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Đang tìm…";

  try {
    const mode = new FormData(form).get("mode");
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, mode, top_k: Number($("#top-k").value) }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Không thể thực hiện tìm kiếm.");

    $("#route-badge").textContent = `Route: ${payload.effective_mode}`;
    $("#latency").textContent = `${payload.latency_ms} ms`;
    $("#result-disclaimer").textContent = payload.disclaimer;
    candidateList.innerHTML = payload.candidates.map(renderCandidate).join("");
    toggleTechnicalScores(false);
    setView("results");
    setEmergency(payload.emergency);
    $("#model-state").innerHTML = "<i></i> Model đã nạp";
  } catch (error) {
    errorState.textContent = error.message;
    setView("error");
  } finally {
    if (!document.body.classList.contains("emergency-active")) submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Tìm mục liên quan";
  }
});

queryInput.addEventListener("input", () => { $("#char-count").textContent = `${queryInput.value.length} / 2000`; });
document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => {
    setEmergency(null);
    queryInput.value = button.dataset.query;
    queryInput.dispatchEvent(new Event("input"));
    queryInput.focus();
  });
});

$("#clear-button").addEventListener("click", () => {
  setEmergency(null);
  form.reset();
  queryInput.value = "";
  queryInput.disabled = false;
  submitButton.disabled = false;
  $("#char-count").textContent = "0 / 2000";
  setView("empty");
  queryInput.focus();
});

$("#technical-toggle").addEventListener("click", (event) => {
  toggleTechnicalScores(event.currentTarget.getAttribute("aria-expanded") !== "true");
});

$("#theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.dataset.theme = current === "dark" ? "light" : "dark";
});

loadStatus();
