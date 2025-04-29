// roleActions.js

//✅ 顯示角色名稱（簡化版）
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const db = getDatabase();

export async function renderRoleUI(playerName, roomCode) {
  const roleRef = ref(db, `rooms/${roomCode}/players/${playerName}/role`);
  const roleSnap = await get(roleRef);
  if (!roleSnap.exists()) {
    document.getElementById("rolePanel").innerHTML = `<p>❌ 無法讀取角色資訊</p>`;
    return;
  }

  const role = roleSnap.val();
  document.getElementById("rolePanel").innerHTML = `
    <h3>角色資訊</h3>
    <p>你的角色是：<strong>${role}</strong></p>
    <p>請選擇對象並進行投資！</p>
  `;
}
