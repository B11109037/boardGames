// roleActions.js
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

//❗不要在這邊 getDatabase()！

export async function renderRoleUI(playerName, roomCode) {
  const db = getDatabase(); //✅ 只有這裡才拿！這時一定是已經 initialize 完成了！

  const roleRef = ref(db, `rooms/${roomCode}/players/${playerName}/role`);
  const roleSnap = await get(roleRef);

  if (!roleSnap.exists()) {
    document.getElementById("rolePanel").innerHTML = `<p>❌ 無法讀取角色資訊</p>`;
    return;
  }

  const role = roleSnap.val();
  console.log("成功讀取角色：", role); //✅ debug 用
  document.getElementById("rolePanel").innerHTML = `
    <h3>角色資訊</h3>
    <p>你的角色是：<strong>${role}</strong></p>
    <p>請選擇對象並進行投資！</p>
  `;
}
