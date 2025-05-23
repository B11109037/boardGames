// ✅ 結合投資代理人投資邏輯 + 接收投資並分配金額邏輯
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

  // ============ 接收投資並分配金額邏輯 ============
  let latestInvestors = {};
  let latestGivenBack = {};
  function updateInvestorDisplay() {
    const extraInfo = document.getElementById("roleExtraInfo");
    if (!extraInfo) return;
    if (Object.keys(latestInvestors).length === 0) {
      extraInfo.innerHTML = "⚠️ 目前還沒有人投資你";
      return;
    }
    let html = "<h4>投資你的人：</h4>";
    for (let name in latestInvestors) {
      const invested = latestInvestors[name];
      const returned = latestGivenBack[name] || 0;
      html += `<p>${name}：$${invested}（已回饋 $${returned}）</p>`;
    }
    extraInfo.innerHTML = html;
  }

  if (role === "詐騙者" || role === "投資代理人") {
    const investorsRef = ref(db, `rooms/${roomCode}/players/${playerName}/investors`);
    const givenBackRef = ref(db, `rooms/${roomCode}/players/${playerName}/givenBack`);
    const allocateSection = document.getElementById("allocateSection");

    allocateSection.innerHTML = `
      <h3>我要分配金額：</h3>
      <label for="allocateTarget">選擇對象：</label>
      <select id="allocateTarget"></select>
      <label for="allocateAmount">分配金額：</label>
      <input type="number" id="allocateAmount" placeholder="輸入金額，例如 20" min="1">
      <button id="allocateConfirmBtn">確認分配</button>
      <p id="allocateStatus" style="color: green;"></p>
    `;

    const select = document.getElementById("allocateTarget");

    onValue(investorsRef, (snap) => {
      latestInvestors = snap.val() || {};
      select.innerHTML = "";
      for (let name in latestInvestors) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      }
      allocateSection.style.display = Object.keys(latestInvestors).length > 0 ? "block" : "none";
      updateInvestorDisplay();
    });

    onValue(givenBackRef, (snap) => {
      latestGivenBack = snap.val() || {};
      updateInvestorDisplay();
    });

    document.getElementById("allocateConfirmBtn").addEventListener("click", async () => {
      const targetName = document.getElementById("allocateTarget").value;
      const amount = parseInt(document.getElementById("allocateAmount").value);
      const status = document.getElementById("allocateStatus");

      if (!targetName || isNaN(amount) || amount <= 0) {
        status.style.color = "red";
        status.textContent = "請輸入正確金額並選擇對象";
        return;
      }

      const moneyRef = ref(db, `rooms/${roomCode}/players/${playerName}/money`);
      const moneySnap = await get(moneyRef);
      const currentMoney = moneySnap.exists() ? moneySnap.val() : 0;

      if (currentMoney < amount) {
        status.style.color = "red";
        status.textContent = "❌ 金額不足，無法分配！";
        return;
      }
//接續上面
     const targetMoneyRef = ref(db, `rooms/${roomCode}/players/${targetName}/money`);
      const targetMoneySnap = await get(targetMoneyRef);
      const targetMoney = targetMoneySnap.exists() ? targetMoneySnap.val() : 0;

      const receivedRef = ref(db, `rooms/${roomCode}/players/${targetName}/received/${playerName}`);
      const receivedSnap = await get(receivedRef);
      const oldReceived = receivedSnap.exists() ? receivedSnap.val() : 0;

      const givenBackTargetRef = ref(db, `rooms/${roomCode}/players/${playerName}/givenBack/${targetName}`);
      const givenBackSnap = await get(givenBackTargetRef);
      const alreadyGiven = givenBackSnap.exists() ? givenBackSnap.val() : 0;

      await update(ref(db), {
        [`rooms/${roomCode}/players/${targetName}/received/${playerName}`]: oldReceived + amount,
        [`rooms/${roomCode}/players/${playerName}/money`]: currentMoney - amount,
        [`rooms/${roomCode}/players/${targetName}/money`]: targetMoney + amount,
        [`rooms/${roomCode}/players/${playerName}/givenBack/${targetName}`]: alreadyGiven + amount
      });

      document.getElementById("allocateAmount").value = "";
      document.getElementById("allocateTarget").selectedIndex = 0;
      status.style.color = "green";
      status.textContent = `✅ 成功分配 ${targetName} $${amount}`;
    });
  }
    // ============詐騙者功能 ============
  // ============ 普通人查看收到的金額 ============
  if (role !== "詐騙者" && role !== "投資代理人") {
    const receivedRef = ref(db, `rooms/${roomCode}/players/${playerName}/received`);
    onValue(receivedRef, (snap) => {
      const received = snap.val() || {};
      let receivedPanel = document.getElementById("receivedPanel");
      if (!receivedPanel) {
        receivedPanel = document.createElement("div");
        receivedPanel.id = "receivedPanel";
        receivedPanel.style.marginTop = "20px";
        rolePanel.appendChild(receivedPanel);
      }

      receivedPanel.innerHTML = "";
      if (Object.keys(received).length === 0) {
        receivedPanel.innerHTML = `<h4>你尚未收到任何金額</h4>`;
      } else {
        let html = "<h4>你收到的金額：</h4>";
        for (let name in received) {
          html += `<p>${name} 分配給你 $${received[name]}</p>`;
        }
        receivedPanel.innerHTML = html;
      }
    });
  }

  // ============ 投資代理人選擇方案與投資邏輯 ============
  if (role === "投資代理人") {
    const agentOptionRef = ref(db, `rooms/${roomCode}/players/${playerName}/agentOption`);
    const section = document.getElementById("agentOptionsSection");

    get(agentOptionRef).then(async (snap) => {
      let existing = snap.val();
      if (existing?.locked === true) {
        section.style.display = "block";
        section.innerHTML = `
          <h3>你已選擇方案 ${existing.option}</h3>
          <p>成功機率 ${existing.chance}%、回報倍率 ${existing.multiplier} 倍</p>
          <p id="agentRoundsLeft">剩餘回合：${existing.roundsLeft}</p>
          <div class="card" style="margin-top: 10px;">
            <label for="investAmount">投入金額：</label>
            <input type="number" id="investAmount" placeholder="輸入金額，例如 20" min="1">
            <button id="investAgent">確認投資</button>
            <p id="investResult" style="color: green;"></p>
          </div>
        `;

        const roundsRef = ref(db, `rooms/${roomCode}/players/${playerName}/agentOption/roundsLeft`);
        onValue(roundsRef, snap => {
          const el = document.getElementById("agentRoundsLeft");
          if (el) el.textContent = `剩餘回合：${snap.val() ?? 0}`;
        });

        onValue(agentOptionRef, (snap) => {
          const current = snap.val() || {};
          const invested = current.invested === true;
          const investBtn = document.getElementById("investAgent");
          const amountInput = document.getElementById("investAmount");
          if (investBtn && amountInput) {
            investBtn.disabled = invested;
            amountInput.disabled = invested;
          }
        });

        document.getElementById("investAgent").addEventListener("click", async () => {
          const investBtn = document.getElementById("investAgent");
          const amountInput = document.getElementById("investAmount");
          const result = document.getElementById("investResult");
          investBtn.disabled = true;

          const amount = parseInt(amountInput.value);
          if (isNaN(amount) || amount <= 0) {
            result.style.color = "red";
            result.textContent = "請輸入有效金額！";
            investBtn.disabled = false;
            return;
          }

          const moneyRef = ref(db, `rooms/${roomCode}/players/${playerName}/money`);
          const moneySnap = await get(moneyRef);
          let currentMoney = moneySnap.exists() ? moneySnap.val() : 0;

          if (currentMoney < amount) {
            result.style.color = "red";
            result.textContent = "💸 餘額不足！";
            investBtn.disabled = false;
            return;
          }

          const success = Math.random() * 100 < existing.chance;
          let profit = 0;
          if (success) {
            profit = Math.round(amount * existing.multiplier);
            currentMoney = currentMoney - amount + profit;
            result.style.color = "green";
            result.textContent = `✅ 投資成功！你獲得 $${profit} 💡請點擊「結束本回合動作」`;
          } else {
            currentMoney = currentMoney - amount;
            result.style.color = "red";
            result.textContent = `❌ 投資失敗，損失 $${amount} 💡請點擊「結束本回合動作」`;
          }

          await update(ref(db), {
            [`rooms/${roomCode}/players/${playerName}/money`]: currentMoney,
            [`rooms/${roomCode}/players/${playerName}/agentOption/invested`]: true
          });
        });

        return;
      }

      if (!existing || !existing.options || existing.locked === false) {
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
