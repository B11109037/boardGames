// roleActions.js
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

export async function renderRoleUI(playerName, roomCode) {
  const db = getDatabase();
  const roleRef = ref(db, `rooms/${roomCode}/players/${playerName}/role`);
  const rolePanel = document.getElementById("rolePanel");

  onValue(roleRef, (snap) => {
    if (!snap.exists()) {
      rolePanel.innerHTML = `<p>❌ 無法讀取角色資訊</p>`;
      return;
    }

    const role = snap.val();

    rolePanel.innerHTML = `
      <h3>角色資訊</h3>
      <div id="role">${role}</div>
      <div id="roleExtraInfo"></div>
    `;
  });

  const roundsRef = ref(db, `rooms/${roomCode}/players/${playerName}/rounds`);
  onValue(roundsRef, (snap) => {
    const val = snap.val();
    const extra = document.getElementById("roleExtraInfo");
    if (extra) {
      extra.innerHTML = `<p>剩餘回合：${val ?? 0}</p>`;
    }
  });

  const choiceRef = ref(db, `rooms/${roomCode}/players/${playerName}/agentChoice`);
  onValue(choiceRef, (snap) => {
    const val = snap.val();
    const extra = document.getElementById("roleExtraInfo");
    if (extra) {
      const old = extra.innerHTML;
      extra.innerHTML = `${old}<p>方案選擇：${val ? `方案 ${val}` : "尚未選擇"}</p>`;
    }
  });

  const resultRef = ref(db, `rooms/${roomCode}/players/${playerName}/agentResult`);
  onValue(resultRef, (snap) => {
    const val = snap.val();
    const extra = document.getElementById("roleExtraInfo");
    if (extra) {
      let html = "";
      if (val?.success === true) {
        html = `<p style="color: green;">✅ 投資成功，獲得 $${val.gain}</p>`;
      } else if (val?.success === false) {
        html = `<p style="color: red;">❌ 投資失敗，損失 $${val.loss}</p>`;
      }
      extra.innerHTML += html;
    }
  });
}
