"use strict";
var PatientPage;
(function (PatientPage) {
    const ready = HospitalAuth.guard("patient");
    const form = document.querySelector("#queue-form");
    const serviceSelect = document.querySelector("#queue-type");
    const prioritySelect = document.querySelector("#queue-priority");
    const error = document.querySelector("#queue-error");
    const submit = document.querySelector("#queue-submit");
    const result = document.querySelector("#ticket-result");
    const cards = document.querySelector("#service-cards");
    const estimatePreview = document.querySelector("#queue-estimate-preview");
    const storedIdKey = "myQueueTicketId";
    let currentId = sessionStorage.getItem(storedIdKey);
    let lastServiceSignature = "";
    function renderServiceNote() {
        const selected = HospitalQueue.services().find((service) => service.code === serviceSelect?.value);
        const note = document.getElementById("service-hours");
        if (note)
            note.textContent = selected
                ? `${selected.name} aktif · rata-rata ${selected.averageMinutes} menit per pasien · ${HospitalQueue.waitingTickets(selected.code).length} pasien menunggu.`
                : "Pilih satu poli aktif untuk melihat antreannya.";
    }
    function renderEstimatePreview() {
        if (!estimatePreview)
            return;
        const service = HospitalQueue.services().find((item) => item.code === serviceSelect?.value && item.active);
        const value = prioritySelect?.value;
        if (!service || (value !== "normal" && value !== "lansia" && value !== "disabilitas" && value !== "vip")) {
            estimatePreview.textContent = "Pilih poli dan prioritas untuk melihat perkiraan waktu dilayani.";
            return;
        }
        const estimate = HospitalQueue.estimateForNewTicket(service.code, value);
        estimatePreview.textContent = `${service.name}: ${estimate.ahead} nomor di depan · perkiraan dilayani ±${estimate.minutes} menit.`;
    }
    function renderServices() {
        if (!serviceSelect || !submit)
            return;
        const previous = serviceSelect.value;
        const all = HospitalQueue.services();
        const signature = JSON.stringify(all.map((service) => [service.code, service.name, service.active, service.averageMinutes]));
        if (signature === lastServiceSignature) {
            renderServiceNote();
            renderEstimatePreview();
            return;
        }
        lastServiceSignature = signature;
        serviceSelect.replaceChildren();
        const open = all.filter((service) => service.active);
        if (open.length === 0) {
            serviceSelect.add(new Option("Belum ada poli aktif", ""));
            serviceSelect.disabled = true;
            submit.disabled = true;
        }
        else {
            serviceSelect.disabled = false;
            submit.disabled = false;
            serviceSelect.add(new Option("Pilih layanan", ""));
            open.forEach((service) => serviceSelect.add(new Option(`${service.code} · ${service.name}`, service.code)));
            if (open.some((service) => service.code === previous))
                serviceSelect.value = previous;
        }
        renderServiceNote();
        renderEstimatePreview();
        if (!cards)
            return;
        cards.replaceChildren();
        for (const service of all) {
            const card = document.createElement("button");
            card.type = "button";
            card.dataset.code = service.code;
            card.className = `patient-service-card${service.code === serviceSelect.value ? " selected" : ""}`;
            card.disabled = !service.active;
            const title = document.createElement("strong");
            title.textContent = `${service.name} (${service.code})`;
            const hours = document.createElement("small");
            hours.textContent = service.active ? "Aktif · dapat mengambil tiket" : "Nonaktif · tiket baru ditutup";
            card.append(title, hours);
            card.addEventListener("click", () => {
                serviceSelect.value = service.code;
                renderServiceNote();
                renderEstimatePreview();
                cards.querySelectorAll(".patient-service-card").forEach((item) => item.classList.remove("selected"));
                card.classList.add("selected");
                prioritySelect?.focus();
            });
            cards.append(card);
        }
    }
    function renderMyTicket() {
        if (!result || !currentId)
            return;
        const ticket = HospitalQueue.tickets().find((item) => item.id === currentId);
        if (!ticket) {
            result.hidden = true;
            return;
        }
        result.hidden = false;
        const service = HospitalQueue.services().find((item) => item.code === ticket.queueCode);
        const number = document.getElementById("ticket-number");
        const detail = document.getElementById("ticket-detail");
        const estimate = document.getElementById("ticket-estimate");
        const status = document.getElementById("ticket-status");
        const alert = document.getElementById("ticket-alert");
        if (number)
            number.textContent = ticket.ticketNumber;
        if (detail)
            detail.textContent = `${service?.name ?? "Layanan"} · Prioritas ${ticket.priority} · ${new Date(ticket.createdAt).toLocaleString("id-ID")}`;
        if (estimate)
            estimate.textContent = ticket.status === "waiting"
                ? `Perkiraan tunggu: ±${HospitalQueue.estimateMinutes(ticket)} menit (${HospitalQueue.waitingAhead(ticket)} pasien di depan).`
                : ticket.status === "called" ? "Nomor Anda sedang dipanggil. Segera menuju loket."
                    : ticket.status === "skipped" ? "Nomor dilewati. Hubungi petugas untuk dimasukkan kembali ke antrean."
                        : "Pelayanan tiket ini telah selesai.";
        if (status)
            status.textContent = `Status: ${ticket.status === "waiting" ? "Menunggu" : ticket.status === "called" ? "Dipanggil" : ticket.status === "skipped" ? "Dilewati" : "Selesai"}`;
        if (alert) {
            const almost = ticket.status === "waiting" && HospitalQueue.waitingAhead(ticket) <= 1;
            alert.hidden = !almost && ticket.status !== "called" && ticket.status !== "skipped";
            alert.textContent = ticket.status === "called" ? "Nomor Anda sedang dipanggil. Silakan menuju loket sekarang."
                : ticket.status === "skipped" ? "Nomor Anda dilewati. Minta petugas mengembalikannya ke antrean."
                    : almost ? "Antrean Anda hampir tiba. Tetap pantau nomor di layar." : "";
        }
    }
    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (error)
            error.textContent = "";
        try {
            if (!serviceSelect?.value || !prioritySelect)
                throw new Error("Pilih layanan dan prioritas.");
            const priority = prioritySelect.value;
            if (priority !== "normal" && priority !== "lansia" && priority !== "disabilitas" && priority !== "vip") {
                throw new Error("Prioritas tidak dikenal.");
            }
            const ticket = HospitalQueue.takeTicket(serviceSelect.value, priority);
            currentId = ticket.id;
            sessionStorage.setItem(storedIdKey, ticket.id);
            renderMyTicket();
            result?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        catch (cause) {
            if (error)
                error.textContent = cause instanceof Error ? cause.message : "Nomor gagal dibuat.";
        }
    });
    document.getElementById("take-another")?.addEventListener("click", () => {
        currentId = null;
        sessionStorage.removeItem(storedIdKey);
        if (result)
            result.hidden = true;
        serviceSelect?.focus();
    });
    document.getElementById("print-ticket")?.addEventListener("click", () => window.print());
    renderServices();
    serviceSelect?.addEventListener("change", () => {
        renderServiceNote();
        renderEstimatePreview();
        cards?.querySelectorAll(".patient-service-card").forEach((item) => {
            item.classList.toggle("selected", item instanceof HTMLElement && item.dataset.code === serviceSelect.value);
        });
    });
    prioritySelect?.addEventListener("change", renderEstimatePreview);
    renderMyTicket();
    window.addEventListener("storage", () => { renderServices(); renderMyTicket(); });
    window.addEventListener("hospital-queue-change", () => { renderServices(); renderMyTicket(); });
    window.setInterval(() => { renderServices(); renderMyTicket(); }, 2500);
})(PatientPage || (PatientPage = {}));
