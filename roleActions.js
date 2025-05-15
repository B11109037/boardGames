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

      if (existing && String(existing.locked) === "true") {
        section.style.display = "block";
        section.innerHTML = `
          <h3>你已選擇方案 ${existing.option}</h3>
          <p>成功機率 ${existing.chance}%、回報倍率 ${existing.multiplier} 倍</p>
          <p>剩餘回合：${existing.roundsLeft}</p>
          ${existing.roundsLeft > 0 ? `
            <div class="card" style="margin-top: 10px;">
              <label for="investAmount">投入金額：</label>
              <input type="number" id="investAmount" placeholder="輸入金額，例如 20" min="1">
              <button id="investAgent">確認投資</button>
              <p id="investResult" style="color: green;"></p>
            </div>` : '<p style="color:red;">本方案已結束，請等待新代理任務。</p>'}
        `;

        if (existing.roundsLeft > 0) {
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

            if (existing.invested) {
              result.style.color = "red";
              result.textContent = "❌ 本回合已投資，請等待下一回合！";
              return;
            }

            const success = Math.random() * 100 < existing.chance;
            let profit = 0;

            if (success) {
              profit = Math.round(amount * existing.multiplier);
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
          });
        }
        return;
      }

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
        <div id="agentOptions">
          <p id="optionA">A：成功機率 ${optA.chance}%、回報倍率 ${optA.multiplier} 倍、持續 ${optA.duration} 回合</p>
          <p id="optionB">B：成功機率 ${optB.chance}%、回報倍率 ${optB.multiplier} 倍、持續 ${optB.duration} 回合</p>
          <button id="chooseA">選擇 A</button>
          <button id="chooseB">選擇 B</button>
          <p id="agentStatus" style="color: green;"></p>
        </div>
      `;

      document.getElementById("chooseA").addEventListener("click", async () => {
        await lockAgentOption("A", existing.options.A);
        renderRoleUI(playerName, roomCode);
      });

      document.getElementById("chooseB").addEventListener("click", async () => {
        await lockAgentOption("B", existing.options.B);
        renderRoleUI(playerName, roomCode);
      });

      async function lockAgentOption(option, detail) {
        const status = document.getElementById("agentStatus");

        await update(ref(db), {
          [`rooms/${roomCode}/players/${playerName}/agentOption`]: {
            option,
            chance: detail.chance,
            multiplier: detail.multiplier,
            roundsLeft: detail.duration,
            locked: true,
            invested: false
          }
        });

        status.style.color = "green";
        status.textContent = `✅ 已選擇方案 ${option}（尚未投入金額）`;
      }
    });
  }
}
