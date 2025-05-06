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

  // 顯示角色資訊（先建立基本框架）
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

  // 如果角色是詐騙者或投資代理人，啟用分配功能
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
      select.innerHTML = ""; // 清空下拉選單
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

    // 監聽分配按鈕點擊事件
    document.getElementById("allocateConfirmBtn").addEventListener("click", async () => {
      const targetName = document.getElementById("allocateTarget").value;
      const amount = parseInt(document.getElementById("allocateAmount").value);

      if (!targetName || isNaN(amount) || amount <= 0) {
        alert("請選擇對象並輸入正確金額！");
        return;
      }

      const receivedRef = ref(db, `rooms/${roomCode}/players/${targetName}/received/${playerName}`);
      await update(receivedRef, { amount });

      alert(`✅ 已分配 $${amount} 給 ${targetName}`);
    });
  }
}
