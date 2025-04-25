// roleActions.js

//✅ 角色的頁面顯示
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const db = getDatabase();

export async function renderRoleUI(playerName, roomCode) {
  const roleRef = ref(db, `rooms/${roomCode}/players/${playerName}/role`);
  const roleSnap = await get(roleRef);
  if (!roleSnap.exists()) return;

  const role = roleSnap.val();
  const container = document.getElementById("roleActions");
  container.innerHTML = `<h3>角色：${role}</h3>`;

  if (role === "詐騙者" || role === "投資代理人") {
    renderInvestorList(playerName, roomCode, container);
  } else if (role === "普通人") {
    renderInvestmentHistory(playerName, roomCode, container);
  }
}

function renderInvestorList(playerName, roomCode, container) {
  const invRef = ref(db, `rooms/${roomCode}/players/${playerName}/investors`);
  onValue(invRef, (snap) => {
    const investors = snap.val() || {};
    const list = document.createElement("div");
    list.innerHTML = `<h4>投資你的人：</h4>`;

    for (let investor in investors) {
      const amount = investors[investor];
      const item = document.createElement("div");
      item.innerHTML = `
        ${investor}：$${amount}
        <button data-name="${investor}" data-amount="${amount}" class="distribute">分錢</button>
      `;
      list.appendChild(item);
    }

    const distributeAllBtn = document.createElement("button");
    distributeAllBtn.textContent = "📤 分配全部資金";
    distributeAllBtn.onclick = () => distributeAll(playerName, roomCode, investors);
    list.appendChild(distributeAllBtn);

    const scamBtn = document.createElement("button");
    scamBtn.textContent = "🧨 一鍵捲款 (詐騙者專用)";
    scamBtn.onclick = () => scamAll(playerName, roomCode, investors);
    list.appendChild(scamBtn);

    container.appendChild(list);

    list.querySelectorAll(".distribute").forEach(btn => {
      btn.onclick = async () => {
        const target = btn.dataset.name;
        const giveAmount = prompt(`你要分多少錢給 ${target}？`, "10");
        const num = parseInt(giveAmount);
        if (!num || num <= 0 || num > investors[target]) return alert("數值不合法");

        await adjustInvestor(playerName, target, roomCode, num);
      };
    });
  });
}

async function adjustInvestor(from, to, room, amount) {
  const fromRef = ref(db, `rooms/${room}/players/${from}`);
  const toRef = ref(db, `rooms/${room}/players/${to}`);

  const fromSnap = await get(fromRef);
  const toSnap = await get(toRef);
  const fromData = fromSnap.val();
  const toData = toSnap.val();

  await update(fromRef, {
    [`investors/${to}`]: fromData.investors[to] - amount
  });
  await update(toRef, {
    money: (toData.money || 0) + amount
  });
}

async function scamAll(playerName, roomCode, investors) {
  const total = Object.values(investors).reduce((a, b) => a + b, 0);
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerName}`);
  const snap = await get(playerRef);
  const currentMoney = snap.val().money || 0;

  await update(playerRef, {
    money: currentMoney + total,
    investors: null
  });
  alert("你已成功詐騙全部投資金！");
}

async function distributeAll(playerName, roomCode, investors) {
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerName}`);
  const playerSnap = await get(playerRef);
  const currentMoney = playerSnap.val().money || 0;

  let share = Math.floor(currentMoney / Object.keys(investors).length);
  for (let name in investors) {
    const targetRef = ref(db, `rooms/${roomCode}/players/${name}`);
    const targetSnap = await get(targetRef);
    const targetMoney = targetSnap.val().money || 0;
    await update(targetRef, { money: targetMoney + share });
  }

  await update(playerRef, { money: 0 });
  alert("已平均分配所有金額給投資者！");
}

function renderInvestmentHistory(playerName, roomCode, container) {
  const invRef = ref(db, `rooms/${roomCode}/players`);
  onValue(invRef, (snap) => {
    const players = snap.val() || {};
    const history = [];

    for (let target in players) {
      const investors = players[target]?.investors || {};
      if (investors[playerName]) {
        history.push({
          target,
          amount: investors[playerName]
        });
      }
    }

    const box = document.createElement("div");
    box.innerHTML = `<h4>你投資的對象：</h4>`;
    history.forEach(({ target, amount }) => {
      const p = document.createElement("p");
      p.textContent = `${target}：你投資 $${amount}`;
      box.appendChild(p);
    });

    container.appendChild(box);
  });
}
