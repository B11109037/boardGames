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

    onValue(agentOptionRef, async (snap) => {
      const existing = snap.val();
      if (!existing) return;

      const { locked, option, chance, multiplier, roundsLeft, invested } = existing;

      section.style.display = "block";

      if (locked && roundsLeft > 0) {
        section.innerHTML = `
          <h3>你已選擇方案 ${option}</h3>
          <p>成功機率 ${chance}%、回報倍率 ${multiplier} 倍</p>
          <p>剩餘回合：${roundsLeft}</p>
          ${!invested ? `
            <div class="card" style="margin-top: 10px;">
              <label for="investAmount">投入金額：</label>
              <input type="number" id="investAmount" placeholder="輸入金額，例如 20" min="1">
              <button id="investAgent">確認投資</button>
              <p id="investResult" style="color: green;"></p>
            </div>` : `<p style="color: gray;">已投資，請等待下回合</p>`}
        `;

        if (!invested) {
          document.getElementById("investAgent").addEventListener("click", async () => {
            const amount = parseInt(document.getElementById("investAmount").value);
            const result = document.getElementById("investResult");

            if (isNaN(amount) || amount <= 0) {
              result.style.color = "red";
              result.textContent = "請輸入有效金額！";
              return;
            }

            const moneyRef = ref(db, `rooms/${roomCode}/players/${playerName}/money`);
            const moneySnap = await get(moneyRef);
            let currentMoney = moneySnap.exists() ? moneySnap.val() : 0;

            if (currentMoney < amount) {
              result.style.color = "red";
              result.textContent = "💸 餘額不足！";
              return;
            }

            const success = Math.random() * 100 < chance;
            let profit = 0;

            if (success) {
              profit = Math.round(amount * multiplier);
              currentMoney = currentMoney - amount + profit;
              result.style.color = "green";
              result.textContent = `✅ 投資成功！你獲得 $${profit}`;
            } else {
              currentMoney = currentMoney - amount;
              result.style.color = "red";
              result.textContent = `❌ 投資失敗，損失 $${amount}`;
            }

            await update(ref(db), {
              [`rooms/${roomCode}/players/${playerName}/money`]: currentMoney,
              [`rooms/${roomCode}/players/${playerName}/agentOption/invested`]: true
            });

            document.getElementById("investAgent").disabled = true;
            document.getElementById("investAmount").disabled = true;
          });
        }
      } else if (locked && roundsLeft <= 0) {
        // 自動重設為未鎖定新回合
        await update(agentOptionRef, {
          locked: false,
          invested: false
        });
        renderRoleUI(playerName, roomCode); // 重新渲染
      } else {
        // 尚未選擇方案，產生選項
        if (!existing.options) {
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

          await set(agentOptionRef, {
            options: { A: optionA, B: optionB },
            locked: false
          });
          return;
        }

        const optA = existing.options.A;
        const optB = existing.options.B;
        section.innerHTML = `
          <h3>本日代理選項：</h3>
          <div id="agentOptions">
            <p>A：成功機率 ${optA.chance}%、回報倍率 ${optA.multiplier} 倍、持續 ${optA.duration} 回合</p>
            <p>B：成功機率 ${optB.chance}%、回報倍率 ${optB.multiplier} 倍、持續 ${optB.duration} 回合</p>
            <button id="chooseA">選擇 A</button>
            <button id="chooseB">選擇 B</button>
            <p id="agentStatus" style="color: green;"></p>
          </div>
        `;

        document.getElementById("chooseA").addEventListener("click", async () => {
          await lockAgentOption("A", optA);
        });
        document.getElementById("chooseB").addEventListener("click", async () => {
          await lockAgentOption("B", optB);
        });

        async function lockAgentOption(option, detail) {
          await update(agentOptionRef, {
            option,
            chance: detail.chance,
            multiplier: detail.multiplier,
            roundsLeft: detail.duration,
            locked: true,
            invested: false
          });
          renderRoleUI(playerName, roomCode);
        }
      }
    });
  }
}
