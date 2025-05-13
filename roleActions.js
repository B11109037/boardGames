import { getDatabase, ref, get, onValue, update, set } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

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

  rolePanel.innerHTML = `
    <h3>角色資訊</h3>
    <div id="role">${role}</div>
    <div id="roleExtraInfo">...</div>
    <div id="allocateSection" class="card" style="margin-top: 10px; display: none;"></div>
    <div id="agentOptionsSection" class="card" style="margin-top: 10px; display: none;"></div>
  `;

  // 投資代理人顯示今日選項並鎖定選擇後資訊
  if (role === "投資代理人") {
    const agentOptionRef = ref(db, `rooms/${roomCode}/players/${playerName}/agentOption`);
    const section = document.getElementById("agentOptionsSection");

    get(agentOptionRef).then(async (snap) => {
      const existing = snap.val();

      // 已選擇方案，顯示鎖定資訊
      if (existing && existing.locked) {
        section.style.display = "block";
        section.innerHTML = `
          <h3>你已選擇方案 ${existing.option}</h3>
          <p>成功機率 ${existing.chance}%、回報倍率 ${existing.multiplier} 倍</p>
          <p>投入金額：$${existing.amount}，剩餘回合：${existing.roundsLeft}</p>
        `;
        return;
      }

      // 若未選擇則生成選項並儲存至 Firebase
      const optionA = {
        chance: Math.floor(Math.random() * 51) + 50,
        multiplier: (Math.random() * 1 + 1).toFixed(2),
        duration: Math.floor(Math.random() * 4) + 1
      };
      const optionB = {
        chance: Math.floor(Math.random() * 31) + 20,
        multiplier: (Math.random() * 1.5 + 1.5).toFixed(2),
        duration: Math.floor(Math.random() * 4) + 1
      };

      await set(agentOptionRef, {
        options: { A: optionA, B: optionB },
        locked: false
      });

      section.style.display = "block";
      section.innerHTML = `
        <h3>本日代理選項：</h3>
        <p>A：成功機率 ${optionA.chance}%、回報倍率 ${optionA.multiplier} 倍、持續 ${optionA.duration} 回合</p>
        <p>B：成功機率 ${optionB.chance}%、回報倍率 ${optionB.multiplier} 倍、持續 ${optionB.duration} 回合</p>
        <p>請重新整理後選擇方案</p>
      `;
    });
  }
}
