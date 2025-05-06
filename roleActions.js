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

  // 顯示角色資訊區塊與可動態插入的面板
  rolePanel.innerHTML = `
    <h3>角色資訊</h3>
    <div id="role">${role}</div>
    <div id="roleExtraInfo">等待投資資訊...</div>
    <div id="allocateSection" style="margin-top: 10px; display: none;">
      <label>選擇對象：
        <select id="allocateTarget"></select>
      </label>
      <label>分配金額：
        <input type="number" id="allocateAmount" placeholder="輸入金額，例如 20">
      </label>
      <button id="allocateConfirmBtn">確認分配</button>
    </div>
  `;

  // 詐騙者／投資代理人：顯示投資者名單與分配功能
  if (role === "詐騙者" || role === "投資代理人") {
    const investorsRef = ref(db, `rooms/${roomCode}/players/${playerName}/investors`);
    onValue(investorsRef, (snap) => {
      const investors = snap.val() || {};
      const extraInfo = document.getElementById("roleExtraInfo");
      const select = document.getElementById("allocateTarget");
      const allocateSection = document.getElementById("allocateSection");

      if (Object.keys(investors).length === 0) {
        extraInfo.innerHTML = "⚠️ 目前還沒有人投資你";
        allocateSection.style.display = "none";
        return;
      }

      // 顯示投資名單
      let content = "<h4>投資你的人：</h4>";
      select.innerHTML = "";
      for (let name in investors) {
        content += `<p>${name}：$${investors[name]}</p>`;
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      }
      extraInfo.innerHTML = content;
      allocateSection.style.display = "block";
    });

    // 分配金額後：自己扣錢、對方加錢、記錄 received
    document.getElementById("allocateConfirmBtn").addEventListener("click", async () => {
      const targetName = document.getElementById("allocateTarget").value;
      const amount = parseInt(document.getElementById("allocateAmount").value);

      if (!targetName || isNaN(amount) || amount <= 0) {
        alert("請選擇對象並輸入正確金額！");
        return;
      }

      // 取得自己金額
      const moneyRef = ref(db, `rooms/${roomCode}/players/${playerName}/money`);
      const moneySnap = await get(moneyRef);
      const currentMoney = moneySnap.exists() ? moneySnap.val() : 0;

      if (currentMoney < amount) {
        alert("❌ 金額不足，無法分配！");
        return;
      }

      // 取得對方金額
      const targetMoneyRef = ref(db, `rooms/${roomCode}/players/${targetName}/money`);
      const targetMoneySnap = await get(targetMoneyRef);
      const targetMoney = targetMoneySnap.exists() ? targetMoneySnap.val() : 0;

      // 更新三件事：received、自己扣款、對方加款
      await update(ref(db), {
        [`rooms/${roomCode}/players/${targetName}/received/${playerName}`]: amount,
        [`rooms/${roomCode}/players/${playerName}/money`]: currentMoney - amount,
        [`rooms/${roomCode}/players/${targetName}/money`]: targetMoney + amount
      });

      // 清空表單
      document.getElementById("allocateAmount").value = "";
      document.getElementById("allocateTarget").selectedIndex = 0;

      alert(`✅ 已分配 $${amount} 給 ${targetName}`);
    });
  }

  // 普通投資者：顯示我收到的分配金額
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

      receivedPanel.innerHTML = ""; // 清空畫面

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
