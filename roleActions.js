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

  // 顯示角色資訊與分配區塊
  rolePanel.innerHTML = `
    <h3>角色資訊</h3>
    <div id="role">${role}</div>
    <div id="roleExtraInfo">...</div>

    <div id="allocateSection" class="card" style="margin-top: 10px; display: none;">
      <h3>我要分配金額：</h3>
      <label for="allocateTarget">選擇對象：</label>
      <select id="allocateTarget"></select>

      <label for="allocateAmount">分配金額：</label>
      <input type="number" id="allocateAmount" placeholder="輸入金額，例如 20" min="1">
      <button id="allocateConfirmBtn">確認分配</button>

      <p id="allocateStatus" style="color: green;"></p>
    </div>
    <div id="agentOptionsSection" class="card" style="margin-top: 10px; display: none;"></div>
  `;

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

  if (role === "投資代理人") {
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

    const section = document.getElementById("agentOptionsSection");
    section.style.display = "block";
    section.innerHTML = `
      <h3>本日代理選項：</h3>
      <p>A：成功機率 ${optionA.chance}%、回報倍率 ${optionA.multiplier} 倍、持續 ${optionA.duration} 回合</p>
      <p>B：成功機率 ${optionB.chance}%、回報倍率 ${optionB.multiplier} 倍、持續 ${optionB.duration} 回合</p>
      <label>投入金額：</label>
      <input id="agentAmount" type="number" placeholder="例如 30" min="1">
      <button id="chooseA">選擇 A</button>
      <button id="chooseB">選擇 B</button>
      <p id="agentStatus" style="color: green;"></p>
    `;

    document.getElementById("chooseA").addEventListener("click", () => submitAgentOption("A", optionA));
    document.getElementById("chooseB").addEventListener("click", () => submitAgentOption("B", optionB));

    async function submitAgentOption(opt, config) {
      const amount = parseInt(document.getElementById("agentAmount").value);
      const status = document.getElementById("agentStatus");

      if (isNaN(amount) || amount <= 0) {
        status.style.color = "red";
        status.textContent = "請輸入正確金額";
        return;
      }

      const moneyRef = ref(db, `rooms/${roomCode}/players/${playerName}/money`);
      const moneySnap = await get(moneyRef);
      const currentMoney = moneySnap.exists() ? moneySnap.val() : 0;

      if (amount > currentMoney) {
        status.style.color = "red";
        status.textContent = "❌ 金額不足，無法投入！";
        return;
      }

      await update(ref(db), {
        [`rooms/${roomCode}/players/${playerName}/money`]: currentMoney - amount,
        [`rooms/${roomCode}/players/${playerName}/agentOption`]: {
          option: opt,
          chance: config.chance,
          multiplier: config.multiplier,
          amount,
          roundsLeft: config.duration,
          locked: true
        }
      });

      document.getElementById("chooseA").disabled = true;
      document.getElementById("chooseB").disabled = true;
      document.getElementById("agentAmount").disabled = true;
      status.style.color = "green";
      status.textContent = `✅ 已選擇方案 ${opt} 並投入 $${amount}`;
    }
  }

  if (role === "詐騙者" || role === "投資代理人") {
    const investorsRef = ref(db, `rooms/${roomCode}/players/${playerName}/investors`);
    const givenBackRef = ref(db, `rooms/${roomCode}/players/${playerName}/givenBack`);
    const select = document.getElementById("allocateTarget");
    const allocateSection = document.getElementById("allocateSection");

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
}
