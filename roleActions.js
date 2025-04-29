// roleActions.js
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

export async function renderRoleUI(playerName, roomCode) {
  const db = getDatabase();
  const roleRef = ref(db, `rooms/${roomCode}/players/${playerName}/role`);
  const roleSnap = await get(roleRef);

  if (!roleSnap.exists()) {
    document.getElementById("rolePanel").innerHTML = `<p>❌ 無法讀取角色資訊</p>`;
    return;
  }

  const role = roleSnap.val();
  console.log("成功讀取角色：", role);
  const rolePanel = document.getElementById("rolePanel");

  // 初步渲染角色資訊
  rolePanel.innerHTML = `
    <h3>角色資訊</h3>
    <p>你的角色是：<strong>${role}</strong></p>
    <p id="roleExtraInfo">請選擇對象並進行投資！</p>
  `;

  // 如果是詐騙者或投資代理人，顯示被誰投資
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
  }
}
