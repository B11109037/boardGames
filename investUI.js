// components/investUI.js

import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const db = getDatabase();

// 啟動投資功能
export function setupInvestUI(playerName, roomCode) {
  const investPanel = document.getElementById("investPanel");
  investPanel.innerHTML = `
    <h3>我要投資：</h3>
    <label>選擇對象：</label>
    <select id="targetSelect"></select>

    <label>投資金額：</label>
    <input type="number" id="investAmount" placeholder="輸入金額，如20" min="1">

    <button id="investBtn">確認投資</button>

    <h4>你投資的紀錄：</h4>
    <div id="investHistory"></div>
  `;

  // 載入可投資的對象（詐騙者或投資代理人）
  loadTargetPlayers(playerName, roomCode);

  // 綁定按鈕事件
  document.getElementById("investBtn").onclick = () => {
    handleInvest(playerName, roomCode);
  };

  // 每次進來也更新自己投資紀錄
  renderInvestmentHistory(playerName, roomCode);
}

async function loadTargetPlayers(playerName, roomCode) {
  const targetSelect = document.getElementById("targetSelect");
  targetSelect.innerHTML = "";

  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const snap = await get(playersRef);
  const players = snap.val() || {};

  for (let name in players) {
    if (name !== playerName) {
      const role = players[name].role;
      if (role === "詐騙者" || role === "投資代理人") {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `${name} (${role})`;
        targetSelect.appendChild(opt);
      }
    }
  }
}

async function handleInvest(playerName, roomCode) {
  const targetName = document.getElementById("targetSelect").value;
  const amount = parseInt(document.getElementById("investAmount").value);

  if (!targetName || isNaN(amount) || amount <= 0) {
    alert("請正確選擇對象並輸入金額！");
    return;
  }

  const playerRef = ref(db, `rooms/${roomCode}/players/${playerName}`);
  const targetRef = ref(db, `rooms/${roomCode}/players/${targetName}`);

  const [playerSnap, targetSnap] = await Promise.all([get(playerRef), get(targetRef)]);
  const playerData = playerSnap.val();
  const targetData = targetSnap.val();

  if (!playerData || playerData.money < amount) {
    alert("金額不足！");
    return;
  }

  // 更新金額
  await update(playerRef, { money: playerData.money - amount });
  await update(targetRef, {
    money: (targetData.money || 0) + amount,
    [`investors/${playerName}`]: (targetData.investors?.[playerName] || 0) + amount
  });

  alert(`成功投資 ${targetName} $${amount}！`);

  // 重新渲染投資紀錄
  renderInvestmentHistory(playerName, roomCode);
}

function renderInvestmentHistory(playerName, roomCode) {
  const historyDiv = document.getElementById("investHistory");
  historyDiv.innerHTML = "";

  const playersRef = ref(db, `rooms/${roomCode}/players`);
  onValue(playersRef, (snap) => {
    const players = snap.val() || {};

    const historyList = [];

    for (let target in players) {
      const investors = players[target].investors || {};
      if (investors[playerName]) {
        historyList.push(`${target}：$${investors[playerName]}`);
      }
    }

    if (historyList.length > 0) {
      historyDiv.innerHTML = historyList.map(item => `<p>${item}</p>`).join("");
    } else {
      historyDiv.innerHTML = `<p>目前沒有投資紀錄。</p>`;
    }
  });
}
