"use strict";
var HospitalQueue;
(function (HospitalQueue) {
    const serviceKey = "queueTypes";
    const ticketKey = "queueTickets";
    const defaults = [
        { code: "A", name: "Poli Umum", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 10 },
        { code: "B", name: "Poli Gigi", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 15 },
        { code: "C", name: "Pendaftaran", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 5 }
    ];
    function isRecord(value) {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }
    function readArray(key) {
        const value = localStorage.getItem(key);
        if (!value)
            return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    function validTime(value) {
        return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    }
    function normalizeService(value) {
        if (!isRecord(value) || typeof value.code !== "string")
            return null;
        const code = value.code.trim().toUpperCase();
        const name = typeof value.name === "string" ? value.name.trim()
            : typeof value.nama === "string" ? value.nama.trim() : "";
        if (!/^[A-Z]$/.test(code) || !name)
            return null;
        const active = typeof value.active === "boolean" ? value.active
            : typeof value.aktif === "boolean" ? value.aktif
                : typeof value.isActive === "boolean" ? value.isActive : true;
        const openTime = validTime(value.openTime) ? value.openTime : "08:00";
        const closeTime = validTime(value.closeTime) ? value.closeTime : "16:00";
        const averageMinutes = typeof value.averageMinutes === "number" && Number.isFinite(value.averageMinutes)
            ? Math.max(1, Math.min(120, Math.round(value.averageMinutes))) : 10;
        return { code, name, active, openTime, closeTime, averageMinutes };
    }
    function isPriority(value) {
        return value === "normal" || value === "lansia" || value === "disabilitas" || value === "vip";
    }
    function isStatus(value) {
        return value === "waiting" || value === "called" || value === "done" || value === "skipped" || value === "cancelled";
    }
    function normalizeTicket(value) {
        if (!isRecord(value) || typeof value.id !== "string" || typeof value.queueCode !== "string"
            || typeof value.ticketNumber !== "string" || typeof value.number !== "number"
            || !Number.isSafeInteger(value.number) || value.number < 1 || !isStatus(value.status)
            || typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt)))
            return null;
        const ticket = {
            id: value.id,
            queueCode: value.queueCode.toUpperCase(),
            ticketNumber: value.ticketNumber,
            number: value.number,
            priority: isPriority(value.priority) ? value.priority : "normal",
            status: value.status,
            createdAt: value.createdAt,
            callCount: typeof value.callCount === "number" && Number.isSafeInteger(value.callCount)
                ? Math.max(0, value.callCount) : 0
        };
        if (typeof value.calledAt === "string")
            ticket.calledAt = value.calledAt;
        if (typeof value.completedAt === "string")
            ticket.completedAt = value.completedAt;
        if (typeof value.waitingSince === "string" && !Number.isNaN(Date.parse(value.waitingSince)))
            ticket.waitingSince = value.waitingSince;
        return ticket;
    }
    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event("hospital-queue-change"));
    }
    function services() {
        if (localStorage.getItem(serviceKey) === null) {
            const legacy = readArray("jenisAntrian").map(normalizeService).filter((item) => item !== null);
            write(serviceKey, legacy.length ? legacy : defaults);
        }
        return readArray(serviceKey).map(normalizeService).filter((item) => item !== null);
    }
    HospitalQueue.services = services;
    function tickets() {
        return readArray(ticketKey).map(normalizeTicket).filter((item) => item !== null);
    }
    HospitalQueue.tickets = tickets;
    function saveService(input, originalCode) {
        const code = input.code.trim().toUpperCase();
        const name = input.name.trim();
        if (!/^[A-Z]$/.test(code))
            throw new Error("Kode layanan harus tepat satu huruf kapital A–Z.");
        if (!name)
            throw new Error("Nama layanan wajib diisi.");
        if (!validTime(input.openTime) || !validTime(input.closeTime) || input.openTime >= input.closeTime) {
            throw new Error("Jam tutup harus setelah jam buka pada hari yang sama.");
        }
        if (!Number.isInteger(input.averageMinutes) || input.averageMinutes < 1 || input.averageMinutes > 120) {
            throw new Error("Rata-rata layanan harus 1–120 menit.");
        }
        const all = services();
        if (all.some((service) => service.code === code && service.code !== originalCode)) {
            throw new Error(`Kode ${code} sudah dipakai. Pilih huruf lain.`);
        }
        if (all.some((service) => service.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID")
            && service.code !== originalCode)) {
            throw new Error(`Nama layanan ${name} sudah ada.`);
        }
        const next = { ...input, code, name };
        const index = all.findIndex((service) => service.code === originalCode);
        if (index === -1)
            all.push(next);
        else
            all[index] = next;
        write(serviceKey, all);
    }
    HospitalQueue.saveService = saveService;
    function deleteService(code) {
        const all = services();
        if (!all.some((service) => service.code === code))
            throw new Error("Layanan tidak ditemukan.");
        if (tickets().some((ticket) => ticket.queueCode === code)) {
            throw new Error("Reset antrean sebelum menghapus layanan yang sudah memiliki tiket.");
        }
        write(serviceKey, all.filter((service) => service.code !== code));
    }
    HospitalQueue.deleteService = deleteService;
    function resetQueues() {
        write(ticketKey, []);
    }
    HospitalQueue.resetQueues = resetQueues;
    function setServiceActive(code, active) {
        const all = services();
        const service = all.find((item) => item.code === code);
        if (!service)
            throw new Error("Layanan tidak ditemukan.");
        service.active = active;
        write(serviceKey, all);
    }
    HospitalQueue.setServiceActive = setServiceActive;
    function todayKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    HospitalQueue.todayKey = todayKey;
    function todayTickets(code) {
        return tickets().filter((ticket) => todayKey(new Date(ticket.createdAt)) === todayKey()
            && (code === undefined || ticket.queueCode === code));
    }
    HospitalQueue.todayTickets = todayTickets;
    function isOpen(service, date = new Date()) {
        void date;
        return service.active;
    }
    HospitalQueue.isOpen = isOpen;
    function takeTicket(code, priority) {
        if (!isPriority(priority))
            throw new Error("Prioritas tidak dikenal.");
        const service = services().find((item) => item.code === code);
        if (!service || !service.active)
            throw new Error("Layanan belum tersedia atau dinonaktifkan admin.");
        const all = tickets();
        const today = todayTickets(code);
        const number = today.reduce((max, ticket) => Math.max(max, ticket.number), 0) + 1;
        if (number > 999)
            throw new Error("Nomor layanan hari ini sudah mencapai batas 999.");
        const ticket = {
            id: `${code}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            queueCode: code,
            ticketNumber: `${code}-${String(number).padStart(3, "0")}`,
            number,
            priority,
            status: "waiting",
            createdAt: new Date().toISOString(),
            callCount: 0
        };
        all.push(ticket);
        write(ticketKey, all);
        return ticket;
    }
    HospitalQueue.takeTicket = takeTicket;
    function currentCalled(code) {
        return todayTickets(code).filter((ticket) => ticket.status === "called")
            .sort((a, b) => (b.calledAt ?? b.createdAt).localeCompare(a.calledAt ?? a.createdAt))[0];
    }
    HospitalQueue.currentCalled = currentCalled;
    const priorityOrder = { vip: 0, disabilitas: 1, lansia: 2, normal: 3 };
    function waitingTickets(code) {
        return todayTickets(code).filter((ticket) => ticket.status === "waiting")
            .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
            || (a.waitingSince ?? a.createdAt).localeCompare(b.waitingSince ?? b.createdAt)
            || a.number - b.number);
    }
    HospitalQueue.waitingTickets = waitingTickets;
    function skippedTickets(code) {
        return todayTickets(code).filter((ticket) => ticket.status === "skipped").sort((a, b) => a.number - b.number);
    }
    HospitalQueue.skippedTickets = skippedTickets;
    function restoreSkipped(id) {
        const all = tickets();
        const ticket = all.find((item) => item.id === id);
        if (!ticket || ticket.status !== "skipped")
            throw new Error("Hanya tiket dilewati yang bisa dimasukkan kembali.");
        ticket.status = "waiting";
        ticket.waitingSince = new Date().toISOString();
        write(ticketKey, all);
        return ticket;
    }
    HospitalQueue.restoreSkipped = restoreSkipped;
    function nextWaiting(code) {
        return waitingTickets(code)[0];
    }
    HospitalQueue.nextWaiting = nextWaiting;
    function callNext(code) {
        const next = nextWaiting(code);
        if (!next)
            throw new Error("Tidak ada pasien menunggu pada layanan ini.");
        const all = tickets();
        const stored = all.find((ticket) => ticket.id === next.id);
        if (!stored)
            throw new Error("Tiket tidak ditemukan.");
        for (const old of all.filter((ticket) => ticket.queueCode === code && ticket.status === "called")) {
            old.status = "done";
            old.completedAt = new Date().toISOString();
        }
        stored.status = "called";
        stored.calledAt = new Date().toISOString();
        stored.callCount += 1;
        write(ticketKey, all);
        return stored;
    }
    HospitalQueue.callNext = callNext;
    function callTicket(id) {
        const ticket = tickets().find((item) => item.id === id);
        if (!ticket || ticket.status !== "waiting" || nextWaiting(ticket.queueCode)?.id !== id) {
            throw new Error("Panggil tiket berikutnya sesuai urutan prioritas.");
        }
        return callNext(ticket.queueCode);
    }
    HospitalQueue.callTicket = callTicket;
    function skipTicket(id) {
        const all = tickets();
        const ticket = all.find((item) => item.id === id);
        if (!ticket || (ticket.status !== "waiting" && ticket.status !== "called")) {
            throw new Error("Hanya tiket menunggu atau dipanggil yang dapat dilewati.");
        }
        ticket.status = "skipped";
        write(ticketKey, all);
        return ticket;
    }
    HospitalQueue.skipTicket = skipTicket;
    function recall(code) {
        const called = currentCalled(code);
        if (!called)
            throw new Error("Belum ada nomor yang sedang dipanggil.");
        const all = tickets();
        const stored = all.find((ticket) => ticket.id === called.id);
        if (!stored)
            throw new Error("Tiket tidak ditemukan.");
        stored.callCount += 1;
        stored.calledAt = new Date().toISOString();
        write(ticketKey, all);
        return stored;
    }
    HospitalQueue.recall = recall;
    function complete(code) {
        const called = currentCalled(code);
        if (!called)
            throw new Error("Belum ada nomor yang sedang dipanggil.");
        const all = tickets();
        const stored = all.find((ticket) => ticket.id === called.id);
        if (!stored)
            throw new Error("Tiket tidak ditemukan.");
        stored.status = "done";
        stored.completedAt = new Date().toISOString();
        write(ticketKey, all);
        return stored;
    }
    HospitalQueue.complete = complete;
    function waitingAhead(ticket) {
        if (ticket.status !== "waiting")
            return 0;
        const order = waitingTickets(ticket.queueCode);
        const position = order.findIndex((item) => item.id === ticket.id);
        return Math.max(0, position) + (currentCalled(ticket.queueCode) ? 1 : 0);
    }
    HospitalQueue.waitingAhead = waitingAhead;
    function estimateMinutes(ticket) {
        const service = services().find((item) => item.code === ticket.queueCode);
        return waitingAhead(ticket) * (service?.averageMinutes ?? 10);
    }
    HospitalQueue.estimateMinutes = estimateMinutes;
    function estimateForNewTicket(code, priority) {
        const service = services().find((item) => item.code === code);
        if (!service || !service.active)
            return { ahead: 0, minutes: 0 };
        const ahead = waitingTickets(code).filter((ticket) => priorityOrder[ticket.priority] <= priorityOrder[priority]).length
            + (currentCalled(code) ? 1 : 0);
        return { ahead, minutes: ahead * service.averageMinutes };
    }
    HospitalQueue.estimateForNewTicket = estimateForNewTicket;
    function csvToday() {
        const escape = (value) => {
            const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
            return `"${safe.replace(/"/g, '""')}"`;
        };
        const rows = [["Tanggal", "Layanan", "Kode", "Total", "Menunggu", "Dipanggil", "Selesai", "Dilewati", "Dibatalkan"]];
        for (const service of services()) {
            const all = todayTickets(service.code);
            rows.push([
                todayKey(), service.name, service.code, String(all.length),
                String(all.filter((ticket) => ticket.status === "waiting").length),
                String(all.filter((ticket) => ticket.status === "called").length),
                String(all.filter((ticket) => ticket.status === "done").length),
                String(all.filter((ticket) => ticket.status === "skipped").length),
                String(all.filter((ticket) => ticket.status === "cancelled").length)
            ]);
        }
        return "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n");
    }
    HospitalQueue.csvToday = csvToday;
})(HospitalQueue || (HospitalQueue = {}));
