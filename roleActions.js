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

  if (role === "投資代理人") {
    const agentOptionRef = ref(db, `rooms/${roomCode}/players/${playerName}/agentOption`);
    const section = document.getElementById("agentOptionsSection");

    get(agentOptionRef).then(async (snap) => {
      let existing = snap.val();

      // 已選擇方案，顯示鎖定資訊
      if (existing && existing.locked) {
        section.style.display = "block";
        section.innerHTML = `
          <h3>你已選擇方案 ${existing.option}</h3>
          <p>成功機率 ${existing.chance}%、回報倍率 ${existing.multiplier} 倍</p>
          <p>剩餘回合：${existing.roundsLeft}</p>
        `;
        return;
      }

      // 若未選擇則生成選項並儲存至 Firebase
      if (!existing || !existing.options) {
        const optionA = {
          chance: Math.floor(Math.random() * 51) + 50,
          multiplier: parseFloat((Math.random() * 1 + 1).toFixed(2)),
          duration: Math.floor(Math.random() * 4) + 1
        };
        const optionB = {
          chance: Math.floor(Math.random() * 31) + 20,
          multiplier: parseFloat((Math.random() * 1.5 + 1.5).toFixed(2)),
          duration: Math.floor(Math.random() * 4) + 1
        };

        existing = {
          options: { A: optionA, B: optionB },
          locked: false
        };
        await set(agentOptionRef, existing);
      }

      section.style.display = "block";
      const optA = existing.options.A;
      const optB = existing.options.B;
      section.innerHTML = `
        <h3>本日代理選項：</h3>
        <p>A：成功機率 ${optA.chance}%、回報倍率 ${optA.multiplier} 倍、持續 ${optA.duration} 回合</p>
        <p>B：成功機率 ${optB.chance}%、回報倍率 ${optB.multiplier} 倍、持續 ${optB.duration} 回合</p>
        <button id="chooseA">選擇 A</button>
        <button id="chooseB">選擇 B</button>
        <p id="agentStatus" style="color: green;"></p>
      `;

      document.getElementById("chooseA").addEventListener("click", async () => {
        await lockAgentOption("A", existing.options.A);
      });

      document.getElementById("chooseB").addEventListener("click", async () => {
        await lockAgentOption("B", existing.options.B);
      });

      async function lockAgentOption(option, detail) {
        const status = document.getElementById("agentStatus");

        await update(ref(db), {
          [`rooms/${roomCode}/players/${playerName}/agentOption`]: {
            option,
            chance: detail.chance,
            multiplier: detail.multiplier,
            roundsLeft: detail.duration,
            locked: true
          }
        });

        status.style.color = "green";
        status.textContent = `✅ 已選擇方案 ${option}（尚未投入金額）`;
        setTimeout(() => location.reload(), 1000);
      }
    });
  }
} 
