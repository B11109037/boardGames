import { getDatabase, ref, get, onValue, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

export async function renderRoleUI(playerName, roomCode) {
  const db = getDatabase();
  const roleRef = ref(db, `rooms/${roomCode}/players/${playerName}/role`);
  const roleSnap = await get(roleRef);
  const rolePanel = document.getElementById("rolePanel");

  if (!roleSnap.exists()) {
    rolePanel.innerHTML = `<p>❌ 無法讀取角色資訊</p>`;
    return;
  }

  const role = roleSnap.val();

  // 顯示角色資訊與分配區塊
  rolePanel.innerHTML = `
    <h3>角色資訊</h3>
    <div id="role">${role}</div>
    <div id="roleExtraInfo">等待投資資訊...</div>

    <div id="allocateSection" class="card" style="margin-top: 10px; display: none;">
      <h3>我要分配金額：</h3>
      <label for="allocateTarget">選擇對象：</label>
      <select id="allocateTarget"></select>

      <label for="allocateAmount">分配金額：</label>
      <input type="number" id="allocateAmount" placeholder="輸入金額，例如 20" min="1">
      <button id="allocateConfirmBtn">確認分配</button>

      <p id="allocateStatus" style="color: green;"></p>
    </div>
  `;

  // 🔥 暫存投資者資料
  let latestInvestors = {};

  // 詐騙者／投資代理人：顯示投資者名單與分配功能
  if (role === "詐騙者" || role === "投資代理人") {
    const investorsRef = ref(db, `rooms/${roomCode}/players/${playerName}/investors`);
    const select = document.getElementById("allocateTarget");
    const allocateSection = document.getElementById("allocateSection");
    const extraInfo = document.getElementById("roleExtraInfo");

    onValue(investorsRef, (snap) => {
      latestInvestors = snap.val() || {};

      // 更新下拉選單
      select.innerHTML = "";
      for (let name in latestInvestors) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      }

      // 如果有人投資才顯示面板
      allocateSection.style.display = Object.keys(latestInvestors).length > 0 ? "block" : "none";
    });

    // 👉 即時監聽 givenBack 更新畫面
    const givenBackAllRef = ref(db, `rooms/${roomCode}/players/${playerName}/givenBack`);
    onValue(givenBackAllRef, (snap) => {
      const givenBackMap = snap.val() || {};
      let html = "<h4>投資你的人：</h4>";

      for (let name in latestInvestors) {
        const invested = latestInvestors[name];
        const returned = givenBackMap[name] || 0;
        html += `<p>${name}：$${invested}（已回饋 $${returned}）</p>`;
      }

      extraInfo.innerHTML = html;
    });

    // 分配按鈕
    document.getElementById("allocateConfirmBtn").addEventListener("click", async () => {
      const targetName = document.getElementById("allocateTarget").value;
      const amount = parseInt(document.getElementById("allocateAmount").value);
      const status = document.getElementById("allocateStatus");

      if (!targetName || isNaN(amount) || amount <= 0) {
        status.style.color = "red";
        status.textContent = "請輸入正確金額並選擇對象";
        return;
      }

      const moneyRef = ref(db, `rooms/${roomCode}/players/${playerName}/money`);
      const moneySnap = await get(moneyRef);
      const currentMoney = moneySnap.exists() ? moneySnap.val() : 0;

      if (currentMoney < amount) {
        status.style.color = "red";
        status.textContent = "❌ 金額不足，無法分配！";
        return;
      }

      const targetMoneyRef = ref(db, `rooms/${roomCode}/players/${targetName}/money`);
      const targetMoneySnap = await get(targetMoneyRef);
      const targetMoney = targetMoneySnap.exists() ? targetMoneySnap.val() : 0;

      const receivedRef = ref(db, `rooms/${roomCode}/players/${targetName}/received/${playerName}`);
      const receivedSnap = await get(receivedRef);
      const oldReceived = receivedSnap.exists() ? receivedSnap.val() : 0;

      const givenBackRef = ref(db, `rooms/${roomCode}/players/${playerName}/givenBack/${targetName}`);
      const givenBackSnap = await get(givenBackRef);
      const alreadyGiven = givenBackSnap.exists() ? givenBackSnap.val() : 0;

      await update(ref(db), {
        [`rooms/${roomCode}/players/${targetName}/received/${playerName}`]: oldReceived + amount,
        [`rooms/${roomCode}/players/${playerName}/money`]: currentMoney - amount,
        [`rooms/${roomCode}/players/${targetName}/money`]: targetMoney + amount,
        [`rooms/${roomCode}/players/${playerName}/givenBack/${targetName}`]: alreadyGiven + amount
      });

      document.getElementById("allocateAmount").value = "";
      document.getElementById("allocateTarget").selectedIndex = 0;

      status.style.color = "green";
      status.textContent = `✅ 成功分配 ${targetName} $${amount}`;
    });
  }

  // 普通人：顯示我收到的金額（累加）
  if (role !== "詐騙者" && role !== "投資代理人") {
    const receivedRef = ref(db, `rooms/${roomCode}/players/${playerName}/received`);
    onValue(receivedRef, (snap) => {
      const received = snap.val() || {};
      let receivedPanel = document.getElementById("receivedPanel");
      if (!receivedPanel) {
        receivedPanel = document.createElement("div");
        receivedPanel.id = "receivedPanel";
        receivedPanel.style.marginTop = "20px";
        rolePanel.appendChild(receivedPanel);
      }

      receivedPanel.innerHTML = "";

      if (Object.keys(received).length === 0) {
        receivedPanel.innerHTML = `<h4>你尚未收到任何金額</h4>`;
      } else {
        let html = "<h4>你收到的金額：</h4>";
        for (let name in received) {
          html += `<p>${name} 分配給你 $${received[name]}</p>`;
        }
        receivedPanel.innerHTML = html;
      }
    });
  }
}
