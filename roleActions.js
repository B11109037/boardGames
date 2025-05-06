// roleActions.js
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

  // 顯示角色資訊與分配按鈕
  rolePanel.innerHTML = `
    <h3>角色資訊</h3>
    <div id="role">${role}</div>
    <button id="allocateBtn">💸 分配金額給投資者</button>
    <div id="roleExtraInfo">等待投資資訊</div>
  `;

  if (role === "詐騙者" || role === "投資代理人") {
    const investorsRef = ref(db, `rooms/${roomCode}/players/${playerName}/investors`);
    onValue(investorsRef, (snap) => {
      const investors = snap.val() || {};
      const extraInfo = document.getElementById("roleExtraInfo");

      if (Object.keys(investors).length === 0) {
        extraInfo.innerHTML = "⚠️ 目前還沒有人投資你";
        return;
      }

      let content = "<h4>投資你的人：</h4>";
      for (let name in investors) {
        content += `<p>${name}：$${investors[name]}</p>`;
      }
      extraInfo.innerHTML = content;
    });

    // 分配金額按鈕
    const allocateBtn = document.getElementById("allocateBtn");
    allocateBtn.addEventListener("click", async () => {
      const targetName = prompt("請輸入要分配金額的對象名稱：");
      if (!targetName) return;
    
      const amountStr = prompt(`請輸入要分配給 ${targetName} 的金額：`);
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) {
        alert("請輸入正確的金額！");
        return;
      }

      const receivedRef = ref(db, `rooms/${roomCode}/players/${targetName}/received/${playerName}`);
      await update(receivedRef, { amount });
    
      alert(`✅ 已分配 $${amount} 給 ${targetName}`);
    });
  }
}
