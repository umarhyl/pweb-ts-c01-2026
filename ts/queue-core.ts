namespace HospitalQueue {
  export type Priority = "normal" | "lansia" | "disabilitas" | "vip";
  export type TicketStatus = "waiting" | "called" | "done" | "skipped" | "cancelled";

  export interface Service {
    code: string;
    name: string;
    active: boolean;
    openTime: string;
    closeTime: string;
    averageMinutes: number;
  }

  export interface Ticket {
    id: string;
    queueCode: string;
    ticketNumber: string;
    number: number;
    priority: Priority;
    status: TicketStatus;
    createdAt: string;
    calledAt?: string;
    completedAt?: string;
    waitingSince?: string;
    callCount: number;
  }

  const serviceKey = "queueTypes";
  const ticketKey = "queueTickets";
  const defaults: Service[] = [
    { code: "A", name: "Poli Umum", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 10 },
    { code: "B", name: "Poli Gigi", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 15 },
    { code: "C", name: "Pendaftaran", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 5 }
  ];

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function readArray(key: string): unknown[] {
    const value = localStorage.getItem(key);
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function validTime(value: unknown): value is string {
    return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function normalizeService(value: unknown): Service | null {
    if (!isRecord(value) || typeof value.code !== "string") return null;
    const code = value.code.trim().toUpperCase();
    const name = typeof value.name === "string" ? value.name.trim()
      : typeof value.nama === "string" ? value.nama.trim() : "";
    if (!/^[A-Z]$/.test(code) || !name) return null;
    const active = typeof value.active === "boolean" ? value.active
      : typeof value.aktif === "boolean" ? value.aktif
        : typeof value.isActive === "boolean" ? value.isActive : true;
    const openTime = validTime(value.openTime) ? value.openTime : "08:00";
    const closeTime = validTime(value.closeTime) ? value.closeTime : "16:00";
    const averageMinutes = typeof value.averageMinutes === "number" && Number.isFinite(value.averageMinutes)
      ? Math.max(1, Math.min(120, Math.round(value.averageMinutes))) : 10;
    return { code, name, active, openTime, closeTime, averageMinutes };
  }

  function isPriority(value: unknown): value is Priority {
    return value === "normal" || value === "lansia" || value === "disabilitas" || value === "vip";
  }

  function isStatus(value: unknown): value is TicketStatus {
    return value === "waiting" || value === "called" || value === "done" || value === "skipped" || value === "cancelled";
  }

  function normalizeTicket(value: unknown): Ticket | null {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.queueCode !== "string"
      || typeof value.ticketNumber !== "string" || typeof value.number !== "number"
      || !Number.isSafeInteger(value.number) || value.number < 1 || !isStatus(value.status)
      || typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) return null;
    const ticket: Ticket = {
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
    if (typeof value.calledAt === "string") ticket.calledAt = value.calledAt;
    if (typeof value.completedAt === "string") ticket.completedAt = value.completedAt;
    if (typeof value.waitingSince === "string" && !Number.isNaN(Date.parse(value.waitingSince))) ticket.waitingSince = value.waitingSince;
    return ticket;
  }

  function write(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("hospital-queue-change"));
  }

  export function services(): Service[] {
    if (localStorage.getItem(serviceKey) === null) {
      const legacy = readArray("jenisAntrian").map(normalizeService).filter((item): item is Service => item !== null);
      write(serviceKey, legacy.length ? legacy : defaults);
    }
    return readArray(serviceKey).map(normalizeService).filter((item): item is Service => item !== null);
  }

  export function tickets(): Ticket[] {
    return readArray(ticketKey).map(normalizeTicket).filter((item): item is Ticket => item !== null);
  }

  export function saveService(input: Service, originalCode?: string): void {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    if (!/^[A-Z]$/.test(code)) throw new Error("Kode layanan harus tepat satu huruf kapital A–Z.");
    if (!name) throw new Error("Nama layanan wajib diisi.");
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
    if (index === -1) all.push(next);
    else all[index] = next;
    write(serviceKey, all);
  }

  export function deleteService(code: string): void {
    const all = services();
    if (!all.some((service) => service.code === code)) throw new Error("Layanan tidak ditemukan.");
    if (tickets().some((ticket) => ticket.queueCode === code)) {
      throw new Error("Reset antrean sebelum menghapus layanan yang sudah memiliki tiket.");
    }
    write(serviceKey, all.filter((service) => service.code !== code));
  }

  export function resetQueues(): void {
    write(ticketKey, []);
  }

  export function setServiceActive(code: string, active: boolean): void {
    const all = services();
    const service = all.find((item) => item.code === code);
    if (!service) throw new Error("Layanan tidak ditemukan.");
    service.active = active;
    write(serviceKey, all);
  }

  export function todayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  export function todayTickets(code?: string): Ticket[] {
    return tickets().filter((ticket) => todayKey(new Date(ticket.createdAt)) === todayKey()
      && (code === undefined || ticket.queueCode === code));
  }

  export function isOpen(service: Service, date: Date = new Date()): boolean {
    void date;
    return service.active;
  }

  export function takeTicket(code: string, priority: Priority): Ticket {
    if (!isPriority(priority)) throw new Error("Prioritas tidak dikenal.");
    const service = services().find((item) => item.code === code);
    if (!service || !service.active) throw new Error("Layanan belum tersedia atau dinonaktifkan admin.");
    const all = tickets();
    const today = todayTickets(code);
    const number = today.reduce((max, ticket) => Math.max(max, ticket.number), 0) + 1;
    if (number > 999) throw new Error("Nomor layanan hari ini sudah mencapai batas 999.");
    const ticket: Ticket = {
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

  export function currentCalled(code: string): Ticket | undefined {
    return todayTickets(code).filter((ticket) => ticket.status === "called")
      .sort((a, b) => (b.calledAt ?? b.createdAt).localeCompare(a.calledAt ?? a.createdAt))[0];
  }

  const priorityOrder: Record<Priority, number> = { vip: 0, disabilitas: 1, lansia: 2, normal: 3 };

  export function waitingTickets(code: string): Ticket[] {
    return todayTickets(code).filter((ticket) => ticket.status === "waiting")
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        || (a.waitingSince ?? a.createdAt).localeCompare(b.waitingSince ?? b.createdAt)
        || a.number - b.number);
  }

  export function skippedTickets(code: string): Ticket[] {
    return todayTickets(code).filter((ticket) => ticket.status === "skipped").sort((a, b) => a.number - b.number);
  }

  export function restoreSkipped(id: string): Ticket {
    const all = tickets();
    const ticket = all.find((item) => item.id === id);
    if (!ticket || ticket.status !== "skipped") throw new Error("Hanya tiket dilewati yang bisa dimasukkan kembali.");
    ticket.status = "waiting";
    ticket.waitingSince = new Date().toISOString();
    write(ticketKey, all);
    return ticket;
  }

  export function nextWaiting(code: string): Ticket | undefined {
    return waitingTickets(code)[0];
  }

  export function callNext(code: string): Ticket {
    const next = nextWaiting(code);
    if (!next) throw new Error("Tidak ada pasien menunggu pada layanan ini.");
    const all = tickets();
    const stored = all.find((ticket) => ticket.id === next.id);
    if (!stored) throw new Error("Tiket tidak ditemukan.");
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

  export function callTicket(id: string): Ticket {
    const ticket = tickets().find((item) => item.id === id);
    if (!ticket || ticket.status !== "waiting" || nextWaiting(ticket.queueCode)?.id !== id) {
      throw new Error("Panggil tiket berikutnya sesuai urutan prioritas.");
    }
    return callNext(ticket.queueCode);
  }

  export function skipTicket(id: string): Ticket {
    const all = tickets();
    const ticket = all.find((item) => item.id === id);
    if (!ticket || (ticket.status !== "waiting" && ticket.status !== "called")) {
      throw new Error("Hanya tiket menunggu atau dipanggil yang dapat dilewati.");
    }
    ticket.status = "skipped";
    write(ticketKey, all);
    return ticket;
  }

  export function recall(code: string): Ticket {
    const called = currentCalled(code);
    if (!called) throw new Error("Belum ada nomor yang sedang dipanggil.");
    const all = tickets();
    const stored = all.find((ticket) => ticket.id === called.id);
    if (!stored) throw new Error("Tiket tidak ditemukan.");
    stored.callCount += 1;
    stored.calledAt = new Date().toISOString();
    write(ticketKey, all);
    return stored;
  }

  export function complete(code: string): Ticket {
    const called = currentCalled(code);
    if (!called) throw new Error("Belum ada nomor yang sedang dipanggil.");
    const all = tickets();
    const stored = all.find((ticket) => ticket.id === called.id);
    if (!stored) throw new Error("Tiket tidak ditemukan.");
    stored.status = "done";
    stored.completedAt = new Date().toISOString();
    write(ticketKey, all);
    return stored;
  }

  export function waitingAhead(ticket: Ticket): number {
    if (ticket.status !== "waiting") return 0;
    const order = waitingTickets(ticket.queueCode);
    const position = order.findIndex((item) => item.id === ticket.id);
    return Math.max(0, position) + (currentCalled(ticket.queueCode) ? 1 : 0);
  }

  export function estimateMinutes(ticket: Ticket): number {
    const service = services().find((item) => item.code === ticket.queueCode);
    return waitingAhead(ticket) * (service?.averageMinutes ?? 10);
  }

  export function estimateForNewTicket(code: string, priority: Priority): { ahead: number; minutes: number } {
    const service = services().find((item) => item.code === code);
    if (!service || !service.active) return { ahead: 0, minutes: 0 };
    const ahead = waitingTickets(code).filter((ticket) => priorityOrder[ticket.priority] <= priorityOrder[priority]).length
      + (currentCalled(code) ? 1 : 0);
    return { ahead, minutes: ahead * service.averageMinutes };
  }

  export function csvToday(): string {
    const escape = (value: string): string => {
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
}
