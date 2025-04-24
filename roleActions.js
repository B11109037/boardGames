// roleActions.js
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const db = getDatabase();

export async function renderRoleUI(playerName, roomCode) {
  const roleRef = ref(db, `rooms/${roomCode}/players/${playerName}/role`);
  const roleSnap = await get(roleRef);
  if (!roleSnap.exists()) return;

  const role = roleSnap.val();
  const container = document.getElementById("roleActions");
  container.innerHTML = `<h3>角色：${role}</h3>`;

  if (role === "詐騙者" || role === "投資客") {
    renderInvestorList(playerName, roomCode, container);
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
