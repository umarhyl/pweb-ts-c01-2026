namespace OperatorPage {
  const ready = HospitalAuth.guard("operator");
  if (ready) {
    document.documentElement.dataset.auth = "ok";
    HospitalAuth.bindLogout();
  }
  const cards = document.querySelector<HTMLElement>("#operator-cards");
  const message = document.querySelector<HTMLElement>("#operator-message");
  const voice = document.querySelector<HTMLInputElement>("#voice-enabled");

  function announce(ticket: HospitalQueue.Ticket): void {
    if (!voice?.checked) {
      if (message) message.textContent += " Suara dimatikan.";
      return;
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      if (message) message.textContent += " Browser tidak mendukung pembaca suara.";
      return;
    }
    const service = HospitalQueue.services().find((item) => item.code === ticket.queueCode);
    const utterance = new SpeechSynthesisUtterance(`Nomor antrean ${ticket.queueCode}, ${ticket.number}. Silakan menuju ${service?.name ?? "loket pelayanan"}.`);
    utterance.lang = "id-ID";
    utterance.rate = 0.85;
    utterance.onstart = () => { if (message) message.textContent = `🔊 Suara panggilan ${ticket.ticketNumber} sedang diputar.`; };
    utterance.onerror = () => { if (message) message.textContent = "Suara gagal diputar. Periksa volume dan dukungan browser."; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function action(buttonText: string, callback: () => HospitalQueue.Ticket, speak = false, disabled = false): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = buttonText === "Panggil Berikutnya" ? "xp-button xp-primary" : "xp-button";
    button.textContent = buttonText;
    button.disabled = disabled;
    button.addEventListener("click", () => {
      try {
        const ticket = callback();
        if (message) message.textContent = `${ticket.ticketNumber}: ${buttonText.toLowerCase()} berhasil.`;
        render();
        if (speak) announce(ticket);
      } catch (error) {
        if (message) message.textContent = error instanceof Error ? error.message : "Perintah gagal.";
      }
    });
    return button;
  }

  function render(): void {
    if (!ready || !cards) return;
    cards.replaceChildren();
    for (const service of HospitalQueue.services().filter((item) => item.active
      || HospitalQueue.todayTickets(item.code).some((ticket) => ticket.status === "waiting" || ticket.status === "called" || ticket.status === "skipped"))) {
      const called = HospitalQueue.currentCalled(service.code);
      const waiting = HospitalQueue.waitingTickets(service.code);
      const skipped = HospitalQueue.skippedTickets(service.code);
      const next = waiting[0];
      const card = document.createElement("article");
      card.className = "xp-window operator-card";
      const bar = document.createElement("div");
      bar.className = "xp-titlebar";
      bar.textContent = `${service.code} / ${service.name} · ${waiting.length} menunggu${service.active ? "" : " · tiket baru ditutup"}`;
      const body = document.createElement("div");
      body.className = "xp-window-body";
      const grid = document.createElement("div");
      grid.className = "operator-numbers";
      const now = document.createElement("div");
      const nowLabel = document.createElement("span");
      nowLabel.textContent = "SEDANG DIPANGGIL";
      const nowNumber = document.createElement("strong");
      nowNumber.textContent = called?.ticketNumber ?? "Belum ada";
      if (!called) nowNumber.className = "operator-empty";
      now.append(nowLabel, nowNumber);
      const nextBox = document.createElement("div");
      const nextLabel = document.createElement("span");
      nextLabel.textContent = "BERIKUTNYA";
      const nextNumber = document.createElement("strong");
      nextNumber.textContent = next?.ticketNumber ?? "Belum ada";
      if (!next) nextNumber.className = "operator-empty";
      const nextDetail = document.createElement("small");
      nextDetail.textContent = next ? `Prioritas ${next.priority} · ±${HospitalQueue.estimateMinutes(next)} menit` : "Belum ada tiket menunggu";
      nextBox.append(nextLabel, nextNumber, nextDetail);
      grid.append(now, nextBox);
      const controls = document.createElement("div");
      controls.className = "operator-actions";
      controls.append(
        action("Panggil Berikutnya", () => HospitalQueue.callNext(service.code), true, !next),
        action("Panggil Ulang", () => HospitalQueue.recall(service.code), true, !called),
        action("Lewati", () => HospitalQueue.skipTicket((called ?? next)?.id ?? ""), false, !called && !next),
        action("Selesai", () => HospitalQueue.complete(service.code), false, !called)
      );
      body.append(grid, controls);
      if (skipped.length) {
        const skippedPanel = document.createElement("div");
        skippedPanel.className = "skipped-panel";
        const heading = document.createElement("strong");
        heading.textContent = `Dilewati (${skipped.length})`;
        const help = document.createElement("p");
        help.textContent = "Nomor ini tidak dipanggil otomatis. Masukkan kembali jika pasien hadir.";
        skippedPanel.append(heading, help);
        for (const ticket of skipped) {
          const line = document.createElement("div");
          line.className = "skipped-ticket";
          const number = document.createElement("span");
          number.textContent = ticket.ticketNumber;
          line.append(number, action("Kembalikan ke Antrean", () => HospitalQueue.restoreSkipped(ticket.id)));
          skippedPanel.append(line);
        }
        body.append(skippedPanel);
      }
      card.append(bar, body);
      cards.append(card);
    }
    if (!cards.childElementCount) cards.textContent = "Belum ada layanan aktif. Minta admin mengaktifkan poli.";
    const clock = document.getElementById("footer-clock");
    if (clock) clock.textContent = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  if (ready) {
    document.getElementById("test-voice")?.addEventListener("click", () => {
      const service = HospitalQueue.services()[0];
      if (!service) {
        if (message) message.textContent = "Belum ada layanan untuk uji suara.";
        return;
      }
      if (message) message.textContent = "Menguji suara panggilan...";
      announce({ id: "uji", queueCode: service.code, ticketNumber: `${service.code}-001`, number: 1,
        priority: "normal", status: "called", createdAt: new Date().toISOString(), callCount: 1 });
    });
    render();
    window.addEventListener("storage", render);
    window.addEventListener("hospital-queue-change", render);
    window.setInterval(render, 2500);
  }
}
