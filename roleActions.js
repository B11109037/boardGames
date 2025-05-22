import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, get, onValue, update, set, off } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7q0Pv2DtGZ5XripYcDOVxQQcIrkolzdE",
  authDomain: "broadgame-9bc04.firebaseapp.com",
  databaseURL: "https://broadgame-9bc04-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "broadgame-9bc04",
  storageBucket: "broadgame-9bc04.appspot.com",
  messagingSenderId: "220150025271",
  appId: "1:220150025271:web:f4cfe780ebfd73e826c3b2",
  measurementId: "G-6T9GW9LVD7"
};

const app = initializeApp(firebaseConfig);

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

    const agentSnap = await get(agentOptionRef);
    const data = agentSnap.val();
    if (!data || !data.locked) {
      await generateOptions();
    }

    off(agentOptionRef);
    onValue(agentOptionRef, async (snap) => {
      const existing = snap.val();
      section.innerHTML = "";

      if (!existing || !existing.locked) return;

      section.style.display = "block";

      if (existing.roundsLeft <= 0) {
        section.innerHTML = `
          <h3>你已選擇方案 ${existing.option}</h3>
          <p>成功機率 ${existing.chance}%、回報倍率 ${existing.multiplier} 倍</p>
          <p>剩餘回合：0</p>
          <p style="color:red;">本方案已結束，請等待新代理任務。</p>
        `;
        return;
      }

      section.innerHTML = `
        <h3>你已選擇方案 ${existing.option}</h3>
        <p>成功機率 ${existing.chance}%、回報倍率 ${existing.multiplier} 倍</p>
        <p>剩餘回合：${existing.roundsLeft}</p>
        <div class="card" style="margin-top: 10px;">
          <label for="investAmount">投入金額：</label>
          <input type="number" id="investAmount" placeholder="輸入金額，例如 20" min="1">
          <button id="investAgent">確認投資</button>
          <p id="investResult" style="color: green;"></p>
        </div>
      `;

      if (!existing.invested) {
        const investButton = document.getElementById("investAgent");
        const investInput = document.getElementById("investAmount");

        investButton.addEventListener("click", async () => {
          investButton.disabled = true;
          investInput.disabled = true;
          const amount = parseInt(investInput.value);
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

          const playerRef = ref(db, `rooms/${roomCode}/players/${playerName}`);
          await update(playerRef, {
            money: currentMoney,
            "agentOption/invested": true
          });
        });
      }
    });

    const turnEndRef = ref(db, `rooms/${roomCode}/turnEnded`);
    off(turnEndRef);
    onValue(turnEndRef, async (snap) => {
      const val = snap.val();
      if (val === true) {
        const agentSnap = await get(agentOptionRef);
        const data = agentSnap.val();
        if (data && data.locked && data.roundsLeft > 0) {
          await update(agentOptionRef, {
            roundsLeft: data.roundsLeft - 1,
            invested: false
          });
        } else if (data && data.locked && data.roundsLeft <= 1) {
          await set(agentOptionRef, null);
        }
        await set(turnEndRef, false);
      }
    });

    async function generateOptions() {
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

      section.style.display = "block";
      section.innerHTML = `
        <h3>本日代理選項：</h3>
        <p>A：成功機率 ${optionA.chance}%、回報 ${optionA.multiplier} 倍、持續 ${optionA.duration} 回合</p>
        <p>B：成功機率 ${optionB.chance}%、回報 ${optionB.multiplier} 倍、持續 ${optionB.duration} 回合</p>
        <button id="chooseA">選擇 A</button>
        <button id="chooseB">選擇 B</button>
        <p id="agentStatus" style="color: green;"></p>
      `;

      document.getElementById("chooseA").addEventListener("click", async () => {
        await lockOption("A", optionA);
      });

      document.getElementById("chooseB").addEventListener("click", async () => {
        await lockOption("B", optionB);
      });
    }

    async function lockOption(option, detail) {
      await set(agentOptionRef, {
        option,
        chance: detail.chance,
        multiplier: detail.multiplier,
        roundsLeft: detail.duration,
        locked: true,
        invested: false
      });
    }
  }
}
