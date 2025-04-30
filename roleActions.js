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
  const rolePanel = document.getElementById("rolePanel");

  // 🔥 先顯示角色身份
  rolePanel.innerHTML = `
    <h3>角色資訊</h3>
    <div id="roleExtraInfo">載入中...</div>
  `;

  // 🔥 如果角色是詐騙者或投資代理人，再去讀取 investors
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
