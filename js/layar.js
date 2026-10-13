"use strict";
var QueueScreenPage;
(function (QueueScreenPage) {
    const ready = HospitalAuth.guard("patient");
    const list = document.querySelector("#queue-list");
    const screen = document.querySelector("#queue-screen");
    const fullscreen = document.querySelector("#fullscreen-button");
    const voiceButton = document.querySelector("#screen-voice");
    const voiceStatus = document.querySelector("#screen-voice-status");
    let voiceEnabled = false;
    const lastSpoken = new Map();
    function announce(ticket, service) {
        if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
            if (voiceStatus)
                voiceStatus.textContent = "Browser ini tidak mendukung suara otomatis.";
            return;
        }
        const utterance = new SpeechSynthesisUtterance(`Nomor antrean ${ticket.queueCode}, ${ticket.number}. Silakan menuju ${service.name}.`);
        utterance.lang = "id-ID";
        utterance.rate = 0.85;
        utterance.onerror = () => { if (voiceStatus)
            voiceStatus.textContent = "Suara gagal diputar. Periksa speaker atau gunakan panel operator."; };
        window.speechSynthesis.speak(utterance);
        if (voiceStatus)
            voiceStatus.textContent = `🔊 Memutar panggilan ${ticket.ticketNumber}.`;
    }
    function render() {
        if (!list)
            return;
        list.replaceChildren();
        const services = HospitalQueue.services().filter((service) => service.active
            || HospitalQueue.todayTickets(service.code).some((ticket) => ticket.status === "waiting" || ticket.status === "called"));
        if (services.length === 0) {
            const empty = document.createElement("div");
            empty.className = "queue-empty";
            empty.textContent = "Belum ada jenis antrean aktif.";
            list.append(empty);
            return;
        }
        for (const service of services) {
            const called = HospitalQueue.currentCalled(service.code);
            if (called && voiceEnabled) {
                const signature = `${called.id}:${called.callCount}`;
                if (lastSpoken.get(service.code) !== signature) {
                    lastSpoken.set(service.code, signature);
                    announce(called, service);
                }
            }
            const waiting = HospitalQueue.waitingTickets(service.code);
            const next = waiting[0];
            const card = document.createElement("article");
            card.className = "queue-card";
            const heading = document.createElement("div");
            heading.className = "queue-card-heading";
            const code = document.createElement("span");
            code.className = "queue-code";
            code.textContent = service.code;
            const title = document.createElement("div");
            const name = document.createElement("h2");
            name.textContent = service.name;
            const subtitle = document.createElement("p");
            subtitle.textContent = service.active ? "Layanan aktif" : "Tiket baru ditutup; antrean lama tetap diproses";
            title.append(name, subtitle);
            heading.append(code, title);
            const number = document.createElement("div");
            number.className = called ? "queue-number" : "queue-number queue-number-empty";
            number.textContent = called?.ticketNumber ?? "Belum ada nomor dipanggil";
            const nextCall = document.createElement("div");
            nextCall.className = "queue-next";
            const nextLabel = document.createElement("span");
            nextLabel.textContent = "PANGGILAN BERIKUTNYA";
            const nextNumber = document.createElement("strong");
            nextNumber.textContent = next?.ticketNumber ?? "Belum ada";
            nextCall.append(nextLabel, nextNumber);
            const footer = document.createElement("div");
            footer.className = "queue-card-footer";
            const state = document.createElement("span");
            state.textContent = called ? "● DIPANGGIL" : "Nomor muncul setelah operator memanggil";
            const count = document.createElement("span");
            count.textContent = `${waiting.length} pasien menunggu`;
            footer.append(state, count);
            card.append(heading, number, nextCall, footer);
            list.append(card);
        }
    }
    function clock() {
        const element = document.getElementById("screen-clock");
        if (element)
            element.textContent = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    fullscreen?.addEventListener("click", async () => {
        try {
            if (!document.fullscreenElement)
                await screen?.requestFullscreen();
            else
                await document.exitFullscreen();
        }
        catch {
            fullscreen.textContent = "Layar penuh tidak tersedia";
        }
    });
    voiceButton?.addEventListener("click", () => {
        voiceEnabled = !voiceEnabled;
        voiceButton.textContent = voiceEnabled ? "Matikan Suara" : "Aktifkan Suara";
        if (voiceStatus)
            voiceStatus.textContent = voiceEnabled
                ? "Suara aktif di perangkat ini. Panggilan baru akan dibacakan."
                : "Suara layar dimatikan.";
        if (!voiceEnabled && "speechSynthesis" in window)
            window.speechSynthesis.cancel();
        if (voiceEnabled)
            render();
    });
    document.addEventListener("fullscreenchange", () => {
        if (fullscreen)
            fullscreen.textContent = document.fullscreenElement ? "Keluar Layar Penuh" : "Layar Penuh";
    });
    if (ready) {
        render();
        clock();
        window.addEventListener("storage", render);
        window.addEventListener("hospital-queue-change", render);
        window.setInterval(render, 2500);
        window.setInterval(clock, 1000);
    }
})(QueueScreenPage || (QueueScreenPage = {}));
