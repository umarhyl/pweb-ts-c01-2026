"use strict";
var AdminPage;
(function (AdminPage) {
    const ready = HospitalAuth.guard("dashboard");
    if (ready) {
        document.documentElement.dataset.auth = "ok";
        HospitalAuth.bindLogout();
    }
    function element(selector) {
        const found = document.querySelector(selector);
        if (!found)
            throw new Error(`Elemen ${selector} tidak ditemukan.`);
        return found;
    }
    const serviceForm = element("#service-form");
    const manualForm = element("#manual-form");
    const codeInput = element("#service-code");
    const nameInput = element("#service-name");
    const averageInput = element("#avg-minutes");
    const activeInput = element("#service-active");
    const manualService = element("#manual-service");
    const manualPriority = element("#manual-priority");
    const serviceList = element("#service-list");
    const ticketList = element("#admin-ticket-list");
    const message = element("#admin-message");
    const alert = element("#queue-alert");
    const cancelEdit = element("#cancel-edit");
    const manualEstimate = element("#manual-estimate");
    let editingCode;
    let lastManualSignature = "";
    function text(id, value) {
        const node = document.getElementById(id);
        if (node)
            node.textContent = value;
    }
    function report(error) {
        message.textContent = error instanceof Error ? error.message : "Perintah gagal. Silakan coba lagi.";
    }
    function resetForm() {
        editingCode = undefined;
        serviceForm.reset();
        codeInput.readOnly = false;
        cancelEdit.hidden = true;
    }
    function smallButton(label, action, disabled = false) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.disabled = disabled;
        button.addEventListener("click", () => {
            try {
                action();
                render();
            }
            catch (error) {
                report(error);
            }
        });
        return button;
    }
    function renderServices(services) {
        serviceList.replaceChildren();
        const manualSignature = JSON.stringify(services.map((service) => [service.code, service.name, service.active]));
        if (manualSignature !== lastManualSignature) {
            const previous = manualService.value;
            manualService.replaceChildren(new Option("Pilih layanan", ""));
            services.filter((service) => service.active).forEach((service) => {
                manualService.add(new Option(`${service.code} · ${service.name}`, service.code));
            });
            if (Array.from(manualService.options).some((option) => option.value === previous))
                manualService.value = previous;
            lastManualSignature = manualSignature;
        }
        for (const service of services) {
            const row = document.createElement("article");
            row.className = "service-row";
            const info = document.createElement("div");
            const heading = document.createElement("strong");
            heading.textContent = `${service.name} (${service.code})`;
            const count = HospitalQueue.todayTickets(service.code).filter((ticket) => ticket.status === "waiting").length;
            const detail = document.createElement("small");
            detail.textContent = `${count} menunggu · ±${service.averageMinutes} menit/tiket`;
            const status = document.createElement("span");
            status.className = service.active ? "status-open" : "status-closed";
            status.textContent = service.active ? "AKTIF · menerima tiket" : "NONAKTIF · tiket baru ditutup";
            info.append(heading, detail, status);
            const actions = document.createElement("div");
            actions.className = "row-actions";
            actions.append(smallButton("Ubah", () => {
                editingCode = service.code;
                codeInput.value = service.code;
                codeInput.readOnly = true;
                nameInput.value = service.name;
                averageInput.value = String(service.averageMinutes);
                activeInput.checked = service.active;
                cancelEdit.hidden = false;
                serviceForm.scrollIntoView({ behavior: "smooth" });
            }), smallButton(service.active ? "Nonaktifkan" : "Aktifkan", () => {
                HospitalQueue.setServiceActive(service.code, !service.active);
                message.textContent = `${service.name} ${service.active ? "dinonaktifkan. Tiket baru tidak dapat diambil" : "diaktifkan. Tiket baru dapat diambil"}.`;
            }), smallButton("Hapus", () => {
                if (!window.confirm(`Hapus layanan ${service.name}?`))
                    return;
                HospitalQueue.deleteService(service.code);
                message.textContent = `${service.name} dihapus.`;
            }));
            row.append(info, actions);
            serviceList.append(row);
        }
        if (services.length === 0)
            serviceList.textContent = "Belum ada jenis antrean.";
        updateManualEstimate();
    }
    function updateManualEstimate() {
        const service = HospitalQueue.services().find((item) => item.code === manualService.value && item.active);
        if (!service) {
            manualEstimate.textContent = "Pilih poli aktif untuk melihat perkiraan antrean.";
            return;
        }
        const value = manualPriority.value;
        if (value !== "normal" && value !== "lansia" && value !== "disabilitas" && value !== "vip")
            return;
        const estimate = HospitalQueue.estimateForNewTicket(service.code, value);
        manualEstimate.textContent = `${service.name}: ${estimate.ahead} nomor di depan · perkiraan dilayani ±${estimate.minutes} menit.`;
    }
    function renderTickets(services) {
        ticketList.replaceChildren();
        for (const service of services) {
            const all = HospitalQueue.todayTickets(service.code);
            if (all.length === 0)
                continue;
            const group = document.createElement("section");
            group.className = "ticket-group";
            const heading = document.createElement("h3");
            heading.textContent = service.name;
            group.append(heading);
            const order = [...all].sort((a, b) => a.number - b.number);
            for (const ticket of order) {
                const row = document.createElement("div");
                row.className = `admin-ticket-row ticket-${ticket.status}`;
                const info = document.createElement("div");
                const number = document.createElement("strong");
                number.textContent = ticket.ticketNumber;
                const priority = document.createElement("small");
                priority.textContent = ticket.priority;
                const state = document.createElement("span");
                state.textContent = ticket.status === "waiting" ? "Menunggu" : ticket.status === "called" ? "Dipanggil"
                    : ticket.status === "done" ? "Selesai" : ticket.status === "skipped" ? "Dilewati" : "Dibatalkan";
                info.append(number, priority, state);
                row.append(info);
                const actions = document.createElement("div");
                actions.className = "row-actions";
                if (ticket.status === "waiting") {
                    actions.append(smallButton("Panggil", () => {
                        HospitalQueue.callTicket(ticket.id);
                        message.textContent = `${ticket.ticketNumber} dipanggil. Lihat juga layar antrean.`;
                    }, HospitalQueue.nextWaiting(service.code)?.id !== ticket.id), smallButton("Lewati", () => {
                        HospitalQueue.skipTicket(ticket.id);
                        message.textContent = `${ticket.ticketNumber} dilewati.`;
                    }));
                }
                else if (ticket.status === "called") {
                    actions.append(smallButton("Selesai", () => {
                        HospitalQueue.complete(service.code);
                        message.textContent = `${ticket.ticketNumber} selesai.`;
                    }), smallButton("Lewati", () => {
                        HospitalQueue.skipTicket(ticket.id);
                        message.textContent = `${ticket.ticketNumber} dilewati.`;
                    }));
                }
                else if (ticket.status === "skipped") {
                    actions.append(smallButton("Kembalikan ke Antrean", () => {
                        HospitalQueue.restoreSkipped(ticket.id);
                        message.textContent = `${ticket.ticketNumber} kembali menunggu pada urutan baru.`;
                    }));
                }
                row.append(actions);
                group.append(row);
            }
            ticketList.append(group);
        }
        if (!ticketList.childElementCount)
            ticketList.textContent = "Belum ada tiket hari ini. Tiket pasien akan muncul di sini.";
    }
    function render() {
        if (!ready)
            return;
        const all = HospitalQueue.todayTickets();
        const waiting = all.filter((ticket) => ticket.status === "waiting");
        const services = HospitalQueue.services();
        text("stat-total", String(all.length));
        text("stat-waiting", String(waiting.length));
        text("stat-called", String(all.filter((ticket) => ticket.status === "called").length));
        text("stat-done", String(all.filter((ticket) => ticket.status === "done").length));
        text("today-label", new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
        const crowded = services.filter((service) => waiting.filter((ticket) => ticket.queueCode === service.code).length >= 5);
        alert.hidden = crowded.length === 0;
        alert.textContent = crowded.length ? `⚠ Antrean menumpuk: ${crowded.map((service) => service.name).join(", ")}.` : "";
        renderServices(services);
        renderTickets(services);
    }
    if (ready) {
        serviceForm.addEventListener("submit", (event) => {
            event.preventDefault();
            try {
                HospitalQueue.saveService({
                    code: codeInput.value, name: nameInput.value, active: activeInput.checked,
                    openTime: "00:00", closeTime: "23:59",
                    averageMinutes: Number(averageInput.value)
                }, editingCode);
                message.textContent = editingCode ? "Layanan diperbarui." : "Layanan baru ditambahkan.";
                resetForm();
                render();
            }
            catch (error) {
                report(error);
            }
        });
        cancelEdit.addEventListener("click", resetForm);
        manualService.addEventListener("change", updateManualEstimate);
        manualPriority.addEventListener("change", updateManualEstimate);
        manualForm.addEventListener("submit", (event) => {
            event.preventDefault();
            try {
                const value = manualPriority.value;
                if (value !== "normal" && value !== "lansia" && value !== "disabilitas" && value !== "vip")
                    throw new Error("Prioritas tidak dikenal.");
                const ticket = HospitalQueue.takeTicket(manualService.value, value);
                message.textContent = `Tiket manual ${ticket.ticketNumber} berhasil diterbitkan.`;
                render();
            }
            catch (error) {
                report(error);
            }
        });
        document.getElementById("reset-queue")?.addEventListener("click", () => {
            if (!window.confirm("Reset akan menghapus semua tiket dan mengulang nomor dari 001. Lanjutkan?"))
                return;
            HospitalQueue.resetQueues();
            message.textContent = "Semua antrean direset. Nomor berikutnya kembali ke 001.";
            render();
        });
        document.getElementById("download-csv")?.addEventListener("click", () => {
            const blob = new Blob([HospitalQueue.csvToday()], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `laporan-antrean-${HospitalQueue.todayKey()}.csv`;
            anchor.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            message.textContent = "Laporan harian CSV diunduh.";
        });
        render();
        window.addEventListener("storage", render);
        window.addEventListener("hospital-queue-change", render);
        window.setInterval(render, 2500);
    }
})(AdminPage || (AdminPage = {}));
