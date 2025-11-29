// 예약 출고 관리 JS (수정 안정판)
const KEY = "halla_reservations_v1";
const ITEM_KEY = "halla_items_v1";

let currentEditId = null;

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
  const date = forceDate || dateInput.value;

  if (forceDate) {
    dateInput.value = forceDate;
  }

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
    const itemsHtml = (r.items || [])
      .map(i => `<div class="item-line"><span>${i.productName}</span><span></span></div>`)
      .join("");
    c.innerHTML = `
      <b>${r.customerName}</b> (${r.phone || "번호 없음"})<br>
      배송: ${r.deliveryType}${r.address ? " - " + r.address : ""}<br>
      메모: ${r.memo || ""}<br><br>
      ${itemsHtml}
      <div style="margin-top:6px;text-align:right;">
        <button class="btn btn-blue" onclick="openModal('${r.id}')">✏ 수정</button>
        <button class="btn btn-red" onclick="deleteReservation('${r.id}', '${date}')">🗑 삭제</button>
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
  if (!localStorage.getItem(ITEM_KEY)) {
    setStore(["무우", "배추", "양파", "대파", "마늘"], ITEM_KEY);
  }
  refreshSamples();
  renderReservations(today());
});
