const queueList = document.querySelector("#queue-list");
const queueScreen = document.querySelector("#queue-screen");
const fullscreenButton = document.querySelector("#fullscreen-button");
const screenClock = document.querySelector("#screen-clock");
const queueTypeKeys = ["queueTypes", "jenisAntrian"];
const ticketKeys = ["queueTickets", "tiketAntrian"];
function readStorage(keys) {
    for (const key of keys) {
        const storedValue = localStorage.getItem(key);
        if (!storedValue) {
            continue;
        }
        try {
            const parsedValue = JSON.parse(storedValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }
        }
        catch {
            // Ignore malformed data and try the next supported storage key.
        }
    }
    return [];
}
function isActiveQueue(queueType) {
    return queueType.active ?? queueType.aktif ?? queueType.isActive ?? true;
}
function getTicketCode(ticket) {
    return (ticket.queueCode ?? ticket.typeCode ?? ticket.kode ?? "").toUpperCase();
}
function getTicketNumber(ticket) {
    const number = ticket.number ?? ticket.ticketNumber ?? ticket.nomor ?? "-";
    return String(number);
}
function isCalled(status) {
    const normalizedStatus = (status ?? "").toLowerCase();
    return normalizedStatus === "called" || normalizedStatus === "dipanggil";
}
function isWaiting(status) {
    const normalizedStatus = (status ?? "").toLowerCase();
    return normalizedStatus === "waiting"
        || normalizedStatus === "menunggu"
        || normalizedStatus === "pending"
        || normalizedStatus === "queued"
        || normalizedStatus === "antri";
}
function renderQueueScreen() {
    if (!queueList) {
        return;
    }
    const queueTypes = readStorage(queueTypeKeys)
        .filter(isActiveQueue)
        .filter((queueType) => queueType.code);
    const tickets = readStorage(ticketKeys);
    if (queueTypes.length === 0) {
        queueList.innerHTML = `
      <div class="queue-empty">
        <p>Belum ada jenis antrian aktif.</p>
        <span>Data akan diperbarui otomatis.</span>
      </div>
    `;
        return;
    }
    queueList.innerHTML = queueTypes.map((queueType) => {
        const code = queueType.code.toUpperCase();
        const queueTickets = tickets.filter((ticket) => getTicketCode(ticket) === code);
        const calledTicket = queueTickets.find((ticket) => isCalled(ticket.status));
        const waitingCount = queueTickets.filter((ticket) => isWaiting(ticket.status)).length;
        const calledNumber = calledTicket ? getTicketNumber(calledTicket) : "---";
        const queueName = queueType.name ?? queueType.nama ?? "Layanan";
        return `
      <article class="queue-card">
        <div class="queue-card-heading">
          <span class="queue-code">${code}</span>
          <div>
            <h2>${queueName}</h2>
            <p>Loket pelayanan</p>
          </div>
        </div>
        <div class="queue-number">${calledNumber}</div>
        <div class="queue-card-footer">
          <span>Status: <strong>${calledTicket ? "Dipanggil" : "Menunggu"}</strong></span>
          <span>Sisa antrian <strong>${waitingCount}</strong></span>
        </div>
      </article>
    `;
    }).join("");
}
function updateClock() {
    if (!screenClock) {
        return;
    }
    screenClock.textContent = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}
fullscreenButton?.addEventListener("click", async () => {
    try {
        if (!document.fullscreenElement) {
            await queueScreen?.requestFullscreen();
            fullscreenButton.textContent = "Keluar Layar Penuh";
        }
        else {
            await document.exitFullscreen();
            fullscreenButton.textContent = "Layar Penuh";
        }
    }
    catch {
        fullscreenButton.textContent = "Fullscreen tidak tersedia";
    }
});
document.addEventListener("fullscreenchange", () => {
    if (fullscreenButton && !document.fullscreenElement) {
        fullscreenButton.textContent = "Layar Penuh";
    }
});
renderQueueScreen();
updateClock();
window.setInterval(renderQueueScreen, 2500);
window.setInterval(updateClock, 1000);
