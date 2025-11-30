// 예약 출고 관리 JS (수정 안정판)
const KEY = "halla_reservations_v1";
const ITEM_KEY = "halla_items_v1";

let currentEditId = null;
let quickRangeMode = null; // 'normal' | 'item'
let currentActionTarget = { id: null, date: null };

function getStore(k = KEY) {
  try {
    return JSON.parse(localStorage.getItem(k) || "[]");
  } catch (e) {
    return [];
  }
}
function setStore(v, k = KEY) {
  localStorage.setItem(k, JSON.stringify(v));
}
function today() {
  return new Date().toISOString().split("T")[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// (이전 월 범위 관련 함수는 사용하지 않아 제거)

// 🔹 빠른 기간 선택 박스 열기 (버튼 아래 작게 표시)
function openQuickRange(mode) {
  quickRangeMode = mode; // 'normal' 또는 'item'
  const bg = document.getElementById("quickRangeBg");
  if (!bg) return;

  // 이미 펼쳐져 있으면 다시 클릭 시 접기
  if (bg.classList.contains("show") && quickRangeMode === mode) {
    bg.classList.remove("show");
    quickRangeMode = null;
  } else {
    bg.classList.add("show");
  }
}

function closeQuickRange() {
  const bg = document.getElementById("quickRangeBg");
  if (bg) bg.classList.remove("show");
  quickRangeMode = null;
}

// 🔹 어제/오늘/내일/모두 선택 처리 (기준일만 바꿔서 기존 단일 날짜 조회 사용)
function selectQuickRange(type) {
  const viewDate = document.getElementById("viewDate");
  if (!viewDate) return;

  if (type === "yesterday") {
    viewDate.value = getYesterday();
  } else if (type === "today") {
    viewDate.value = today();
  } else if (type === "tomorrow") {
    viewDate.value = getTomorrow();
  } else if (type === "all") {
    // "모두"는 오늘 포함 이후 전체
    viewDate.value = today();
  }

  if (quickRangeMode === "item") {
    if (type === "all") {
      renderItemSummaryAllFromToday();
    } else {
      renderItemSummary();
    }
  } else {
    if (type === "all") {
      renderReservationsAllFromToday();
    } else {
      renderReservations();
    }
  }

  closeQuickRange();
}

// ✅ 연락처 입력 시 자동 하이픈(-)
function formatPhoneNumber(input) {
  let v = input.value.replace(/[^0-9]/g, "");
  if (v.length < 4) input.value = v;
  else if (v.length < 7) input.value = v.replace(/(\d{3})(\d+)/, "$1-$2");
  else if (v.length < 11) input.value = v.replace(/(\d{3})(\d{3,4})(\d+)/, "$1-$2-$3");
  else input.value = v.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
}

function clearAll() {
  if (confirm("⚠ 모든 예약 데이터를 삭제하시겠습니까?")) {
    localStorage.removeItem(KEY);
    alert("✅ 전체 예약 내역이 삭제되었습니다.");
    renderReservations();
  }
}

// 선택한 날짜 이전 예약만 전체 삭제
function clearBeforeDate() {
  const date = document.getElementById("viewDate").value;
  if (!date) {
    alert("출고일을 먼저 선택하세요.");
    return;
  }

  if (!confirm(`${date} 이전 모든 예약을 삭제하시겠습니까?`)) return;

  const all = getStore();
  const cutoff = new Date(date);
  const filtered = all.filter(r => {
    if (!r.deliveryDate) return false;
    return new Date(r.deliveryDate) >= cutoff;
  });

  setStore(filtered);
  alert(`✅ ${date} 이전 예약이 모두 삭제되었습니다.`);
  renderReservations(date);
}

function toggleAddress() {
  const type = document.getElementById("deliveryType").value;
  document.getElementById("addressRow").style.display = type === "배달" ? "flex" : "none";
}

function getSuggestions() {
  return getStore(ITEM_KEY);
}

function refreshSamples() {
  const box = document.getElementById("sampleBox");
  if (!box) return;
  const items = getSuggestions();
  box.innerHTML = "";
  items.forEach(name => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.onclick = () => insertSample(name);
    box.appendChild(btn);
  });
}

function insertSample(name) {
  const ta = document.querySelector("#itemBody textarea");
  if (ta) {
    ta.value += (ta.value ? "\n" : "") + name + " ";
    autoResize(ta);
    ta.focus();
  }
}

function autoResize(t) {
  t.style.height = "auto";
  t.style.height = t.scrollHeight + "px";
}

function openModal(editId = null) {
  currentEditId = editId;
  const bg = document.getElementById("modalBg");
  bg.classList.add("show");

  const formDefault = {
    name: "",
    phone: "",
    date: today(),
    memo: "",
    deliveryType: "배달",
    address: "",
    items: [{ productName: "" }]
  };

  let dataObj = formDefault;

  if (editId) {
    const all = getStore();
    const found = all.find(r => r.id === editId);
    if (found) dataObj = found;
  }

  document.getElementById("name").value = dataObj.customerName || dataObj.name || "";
  document.getElementById("phone").value = dataObj.phone || "";
  document.getElementById("date").value = dataObj.deliveryDate || dataObj.date || today();
  document.getElementById("memo").value = dataObj.memo || "";
  document.getElementById("deliveryType").value = dataObj.deliveryType || "배달";
  document.getElementById("address").value = dataObj.address || "";
  toggleAddress();

  const taText = (dataObj.items || [])
    .map(i => i.productName)
    .filter(Boolean)
    .join("\n");

  document.getElementById("itemBody").innerHTML =
    `<tr><td><textarea placeholder="예: 무우 1개\n배추 2망" oninput="autoResize(this)">${taText}</textarea></td></tr>`;

  refreshSamples();
}

function closeModal() {
  document.getElementById("modalBg").classList.remove("show");
  currentEditId = null;
}


function handleActionChoice(type) {
  const { id, date } = currentActionTarget;
  if (!id) {
    alert("먼저 거래처 카드를 한 개 선택해주세요.");
    return;
  }
  if (type === "edit") {
    openModal(id);
  } else if (type === "delete") {
    deleteReservation(id, date);
  }
}

// 🔹 조회 결과에서 카드 하나를 선택하고, 상단 버튼으로 수정/삭제
function selectReservationCard(elem, id, date) {
  // 기존 선택 해제
  document.querySelectorAll(".res-card.selected").forEach(c => c.classList.remove("selected"));
  // 새 선택
  elem.classList.add("selected");
  currentActionTarget = { id, date };

  // 품목 내역 토글 (카드 안의 상세 영역 show/hide)
  const detail = elem.querySelector(".res-detail");
  if (detail) {
    detail.classList.toggle("open");
  }
}

// (이전) openGlobalActionChoice 팝업 호출은 사용하지 않음

function saveReservation() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const date = document.getElementById("date").value;
  const memo = document.getElementById("memo").value.trim();
  const deliveryType = document.getElementById("deliveryType").value;
  const address = document.getElementById("address").value.trim();

  if (!name || !date) {
    alert("거래처와 출고일은 필수입니다.");
    return;
  }

  // ✅ 연락처 자동 하이픈 저장
  const phoneFormatted = phone
    .replace(/[^0-9]/g, "")
    .replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");

  const items = [];
  const newItemsSet = new Set(getStore(ITEM_KEY));

  document.querySelectorAll("#itemBody textarea").forEach(t => {
    t.value.split(/\n|,/).forEach(line => {
      const clean = line.trim();
      if (clean) {
        items.push({ productName: clean });
        const base = clean.replace(/\d+.*/, "").trim();
        if (base && !newItemsSet.has(base)) newItemsSet.add(base);
      }
    });
  });

  if (!items.length) {
    alert("상품을 입력하세요.");
    return;
  }

  setStore(Array.from(newItemsSet), ITEM_KEY);
  refreshSamples();

  const all = getStore();
  const record = {
    id: currentEditId || ("R" + Date.now()),
    customerName: name,
    phone: phoneFormatted,
    deliveryDate: date,
    deliveryType,
    address,
    memo,
    items
  };

  if (currentEditId) {
    const idx = all.findIndex(r => r.id === currentEditId);
    if (idx >= 0) all[idx] = record;
  } else {
    all.push(record);
  }

  setStore(all);

  alert("✅ 예약이 저장되었습니다.");
  closeModal();
  renderReservations(date);
}

function renderReservations(forceDate) {
  const list = document.getElementById("reservationList");
  const dateInput = document.getElementById("viewDate");
  const date = forceDate || (dateInput && dateInput.value);

  list.innerHTML = "";
  if (!date) {
    list.innerHTML = "<div>출고일을 선택해주세요.</div>";
    return;
  }

  const all = getStore().filter(r => r.deliveryDate === date);
  if (!all.length) {
    list.innerHTML = `<div>${date} 예약이 없습니다.</div>`;
    return;
  }

  const count = document.createElement("div");
  count.className = "res-count";
  count.textContent = `${date} 예약: ${all.length}건`;
  list.appendChild(count);

  all.forEach(r => {
    const c = document.createElement("div");
     c.className = "res-card";
     c.onclick = () => selectReservationCard(c, r.id, date);
    const itemsHtml = (r.items || [])
      .map(i => `<div class="item-line"><span>${i.productName}</span><span></span></div>`)
      .join("");
    const phoneDisplay = r.phone || "번호 없음";
    const phoneRaw = (r.phone || "").replace(/[^0-9]/g, "");
    const phoneHtml = phoneRaw
      ? `<a href="tel:${phoneRaw}" class="res-phone">${phoneDisplay}</a>`
      : `<span class="res-phone">${phoneDisplay}</span>`;

    c.innerHTML = `
      <div class="res-header-line">
        <b>${r.customerName}</b>
        ${phoneHtml}
      </div>
      <div class="res-subline">배송: ${r.deliveryType}${r.address ? " - " + r.address : ""}</div>
      <div class="res-subline">메모: ${r.memo || ""}</div>
      <div class="res-detail">
        ${itemsHtml}
      </div>
    `;
    list.appendChild(c);
  });
}

// 🔹 오늘 포함 이후 모든 예약 조회 (지난 날짜 제외)
function renderReservationsAllFromToday() {
  const list = document.getElementById("reservationList");
  const dateInput = document.getElementById("viewDate");
  const base = today();
  if (dateInput) dateInput.value = base;

  list.innerHTML = "";

  const all = getStore();
  if (!all.length) {
    list.innerHTML = "<div>저장된 예약이 없습니다.</div>";
    return;
  }

  const filtered = all.filter(r => r.deliveryDate && r.deliveryDate >= base)
    .sort((a, b) => (a.deliveryDate || "").localeCompare(b.deliveryDate || ""));

  if (!filtered.length) {
    list.innerHTML = `<div>${base} 이후 예약이 없습니다.</div>`;
    return;
  }

  const count = document.createElement("div");
  count.className = "res-count";
  count.textContent = `${base} 이후 예약: ${filtered.length}건`;
  list.appendChild(count);

  filtered.forEach(r => {
    const c = document.createElement("div");
     c.className = "res-card";
     c.onclick = () => selectReservationCard(c, r.id, r.deliveryDate);
    const itemsHtml = (r.items || [])
      .map(i => `<div class="item-line"><span>${i.productName}</span><span></span></div>`)
      .join("");
    const phoneDisplay = r.phone || "번호 없음";
    const phoneRaw = (r.phone || "").replace(/[^0-9]/g, "");
    const phoneHtml = phoneRaw
      ? `<a href="tel:${phoneRaw}" class="res-phone">${phoneDisplay}</a>`
      : `<span class="res-phone">${phoneDisplay}</span>`;

    c.innerHTML = `
      <b>${r.deliveryDate}</b>
      <div class="res-header-line">
        <b>${r.customerName}</b>
        ${phoneHtml}
      </div>
      <div class="res-subline">배송: ${r.deliveryType}${r.address ? " - " + r.address : ""}</div>
      <div class="res-subline">메모: ${r.memo || ""}</div>
      <div class="res-detail">
        ${itemsHtml}
      </div>
    `;
    list.appendChild(c);
  });
}

function deleteReservation(id, date) {
  if (!confirm("삭제하시겠습니까?")) return;
  const data = getStore().filter(r => r.id !== id);
  setStore(data);
  alert("🗑 삭제되었습니다.");
  renderReservations(date || document.getElementById("viewDate").value);
}

// 🔹 직접 기간 선택 조회 (rangeStart ~ rangeEnd)
function applyManualRange() {
  const startInput = document.getElementById("rangeStart");
  const endInput = document.getElementById("rangeEnd");
  const list = document.getElementById("reservationList");
  if (!startInput || !endInput || !list) return;

  const start = startInput.value;
  const end = endInput.value;

  if (!start || !end) {
    alert("시작일과 종료일을 모두 선택해주세요.");
    return;
  }
  if (start > end) {
    alert("시작일이 종료일보다 클 수 없습니다.");
    return;
  }

  const all = getStore().filter(r => r.deliveryDate && r.deliveryDate >= start && r.deliveryDate <= end)
    .sort((a, b) => (a.deliveryDate || "").localeCompare(b.deliveryDate || ""));

  list.innerHTML = "";
  if (!all.length) {
    list.innerHTML = `<div>${start} ~ ${end} 사이 예약이 없습니다.</div>`;
    return;
  }

  const count = document.createElement("div");
  count.className = "res-count";
  count.textContent = `${start} ~ ${end} 예약: ${all.length}건`;
  list.appendChild(count);

  all.forEach(r => {
    const c = document.createElement("div");
    c.className = "res-card";
    c.onclick = () => selectReservationCard(c, r.id, r.deliveryDate);
    const itemsHtml = (r.items || [])
      .map(i => `<div class="item-line"><span>${i.productName}</span><span></span></div>`)
      .join("");
    const phoneDisplay = r.phone || "번호 없음";
    const phoneRaw = (r.phone || "").replace(/[^0-9]/g, "");
    const phoneHtml = phoneRaw
      ? `<a href="tel:${phoneRaw}" class="res-phone">${phoneDisplay}</a>`
      : `<span class="res-phone">${phoneDisplay}</span>`;

    c.innerHTML = `
      <b>${r.deliveryDate}</b>
      <div class="res-header-line">
        <b>${r.customerName}</b>
        ${phoneHtml}
      </div>
      <div class="res-subline">배송: ${r.deliveryType}${r.address ? " - " + r.address : ""}</div>
      <div class="res-subline">메모: ${r.memo || ""}</div>
      <div class="res-detail">
        ${itemsHtml}
      </div>
    `;
    list.appendChild(c);
  });
}

function renderItemSummary() {
  const list = document.getElementById("reservationList");
  const date = document.getElementById("viewDate").value;
  list.innerHTML = "";

  if (!date) {
    list.innerHTML = "<div>출고일을 선택해주세요.</div>";
    return;
  }

  const all = getStore().filter(r => r.deliveryDate === date);
  if (!all.length) {
    list.innerHTML = `<div>${date} 예약이 없습니다.</div>`;
    return;
  }

  const map = {};

  all.forEach(r => {
    (r.items || []).forEach(i => {
      const n = (i.productName || "").trim();
      if (!n) return;
      const m = n.match(/([\(\)가-힣a-zA-Z0-9]+)\s*(\d+)\s*([가-힣a-zA-Z]+)/);
      let item, qty, unit;
      if (m) {
        item = m[1].trim();
        qty = parseInt(m[2]);
        unit = m[3];
      } else {
        item = n.replace(/\d+.*/, "").trim() || n;
        qty = 1;
        unit = "개";
      }
      const key = item + "_" + unit;
      map[key] = (map[key] || 0) + qty;
    });
  });

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

  const textSummary = sorted
    .map(([k, q]) => {
      const [n, u] = k.split("_");
      return `${n} ${q}${u}`;
    })
    .join("\n");

  const card = document.createElement("div");
  card.className = "res-card";
  const rowsHtml = sorted
    .map(([k, q]) => {
      const [n, u] = k.split("_");
      return `<div class="item-line"><span>${n}</span><span>${q}${u}</span></div>`;
    })
    .join("");

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <b>📦 ${date} 품목별 출고 합계</b>
      <button class="btn-copy" onclick="copyText(\`${textSummary}\`)">📋 전체 복사</button>
    </div>
    <hr style="border:0;border-top:1px solid #333;">
    ${rowsHtml}
  `;
  list.appendChild(card);
}

// 🔹 오늘 포함 이후 전체 품목 합계 (지난 날짜 제외)
function renderItemSummaryAllFromToday() {
  const list = document.getElementById("reservationList");
  const base = today();
  const viewDate = document.getElementById("viewDate");
  if (viewDate) viewDate.value = base;
  list.innerHTML = "";

  const all = getStore().filter(r => r.deliveryDate && r.deliveryDate >= base);
  if (!all.length) {
    list.innerHTML = `<div>${base} 이후 예약이 없습니다.</div>`;
    return;
  }

  const map = {};

  all.forEach(r => {
    (r.items || []).forEach(i => {
      const n = (i.productName || "").trim();
      if (!n) return;
      const m = n.match(/([\(\)가-힣a-zA-Z0-9]+)\s*(\d+)\s*([가-힣a-zA-Z]+)/);
      let item, qty, unit;
      if (m) {
        item = m[1].trim();
        qty = parseInt(m[2]);
        unit = m[3];
      } else {
        item = n.replace(/\d+.*/, "").trim() || n;
        qty = 1;
        unit = "개";
      }
      const key = item + "_" + unit;
      map[key] = (map[key] || 0) + qty;
    });
  });

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

  const textSummary = sorted
    .map(([k, q]) => {
      const [n, u] = k.split("_");
      return `${n} ${q}${u}`;
    })
    .join("\n");

  const card = document.createElement("div");
  card.className = "res-card";
  const rowsHtml = sorted
    .map(([k, q]) => {
      const [n, u] = k.split("_");
      return `<div class="item-line"><span>${n}</span><span>${q}${u}</span></div>`;
    })
    .join("");

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <b>📦 ${base} 이후 전체 품목 출고 합계</b>
      <button class="btn-copy" onclick="copyText(\`${textSummary}\`)">📋 전체 복사</button>
    </div>
    <hr style="border:0;border-top:1px solid #333;">
    ${rowsHtml}
  `;
  list.appendChild(card);
}

function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(() => {
      alert("✅ 전체 복사 완료");
    }).catch(() => {
      alert("복사에 실패했습니다. 직접 선택해서 복사해주세요.");
    });
  } else {
    alert("이 환경에서는 자동 복사가 지원되지 않습니다. 내용을 길게 눌러 직접 복사해주세요.");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const viewDate = document.getElementById("viewDate");
  if (viewDate) viewDate.value = today();
  // 직접 기간 선택 입력도 기본값을 오늘로 설정
  const rangeStart = document.getElementById("rangeStart");
  const rangeEnd = document.getElementById("rangeEnd");
  if (rangeStart) rangeStart.value = today();
  if (rangeEnd) rangeEnd.value = today();

  // 일부 브라우저에서 입력칸 끝부분만 눌러지는 문제 보완용: 
  // 날짜 입력 전체 영역 클릭 시 강제로 focus 후 click
  [viewDate, rangeStart, rangeEnd].forEach(el => {
    if (!el) return;
    el.addEventListener("click", () => {
      el.focus();
      // 모바일 브라우저에서도 달력이 잘 뜨도록 한번 더 click 시도
      setTimeout(() => {
        try { el.showPicker && el.showPicker(); } catch (e) {}
      }, 0);
    });
  });
  if (!localStorage.getItem(ITEM_KEY)) {
    setStore(["무우", "배추", "양파", "대파", "마늘"], ITEM_KEY);
  }
  refreshSamples();
  renderReservations(today());
});
