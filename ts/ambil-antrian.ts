interface TakeQueueType {
  code?: string;
  name?: string;
  nama?: string;
  active?: boolean;
  aktif?: boolean;
  isActive?: boolean;
}

interface StoredQueueTicket {
  id: string;
  queueCode: string;
  ticketNumber: string;
  number: number;
  priority: string;
  status: "waiting";
  createdAt: string;
}

const queueForm = document.querySelector<HTMLFormElement>("#queue-form");
const queueTypeSelect = document.querySelector<HTMLSelectElement>("#queue-type");
const queuePrioritySelect = document.querySelector<HTMLSelectElement>("#queue-priority");
const queueError = document.querySelector<HTMLElement>("#queue-error");
const queueSubmit = document.querySelector<HTMLButtonElement>("#queue-submit");
const ticketResult = document.querySelector<HTMLElement>("#ticket-result");
const ticketNumber = document.querySelector<HTMLElement>("#ticket-number");
const ticketDetail = document.querySelector<HTMLElement>("#ticket-detail");
const takeAnotherButton = document.querySelector<HTMLButtonElement>("#take-another");

const queueTypeKeys = ["queueTypes", "jenisAntrian"];
const ticketStorageKey = "queueTickets";

function readQueueTypes(): TakeQueueType[] {
  for (const key of queueTypeKeys) {
    const value = localStorage.getItem(key);
    if (!value) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as TakeQueueType[];
      }
    } catch {
      continue;
    }
  }

  return [];
}

function readTickets(): StoredQueueTicket[] {
  const value = localStorage.getItem(ticketStorageKey);
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as StoredQueueTicket[] : [];
  } catch {
    return [];
  }
}

function getActiveQueueTypes(): TakeQueueType[] {
  return readQueueTypes()
    .filter((queueType) => queueType.code)
    .filter((queueType) => queueType.active ?? queueType.aktif ?? queueType.isActive ?? true);
}

function renderQueueTypes(): void {
  if (!queueTypeSelect) {
    return;
  }

  const selectedCode = queueTypeSelect.value;
  const queueTypes = getActiveQueueTypes();
  queueTypeSelect.innerHTML = "";

  if (queueTypes.length === 0) {
    queueTypeSelect.add(new Option("Belum ada layanan tersedia", ""));
    queueTypeSelect.disabled = true;
    if (queueSubmit) {
      queueSubmit.disabled = true;
    }
    return;
  }

  queueTypeSelect.disabled = false;
  if (queueSubmit) {
    queueSubmit.disabled = false;
  }

  queueTypes.forEach((queueType) => {
    const code = queueType.code!.toUpperCase();
    const name = queueType.name ?? queueType.nama ?? "Layanan";
    queueTypeSelect.add(new Option(`${code} - ${name}`, code));
  });

  if (queueTypes.some((queueType) => queueType.code!.toUpperCase() === selectedCode)) {
    queueTypeSelect.value = selectedCode;
  }
}

function createTicket(): void {
  if (!queueTypeSelect || !queuePrioritySelect || !ticketResult || !ticketNumber || !ticketDetail) {
    return;
  }

  const code = queueTypeSelect.value;
  const selectedType = getActiveQueueTypes().find(
    (queueType) => queueType.code!.toUpperCase() === code
  );
  if (!selectedType) {
    throw new Error("Pilih jenis layanan terlebih dahulu.");
  }

  const tickets = readTickets();
  const lastNumber = tickets
    .filter((ticket) => ticket.queueCode?.toUpperCase() === code)
    .reduce((highest, ticket) => Math.max(highest, Number(ticket.number) || 0), 0);
  const nextNumber = lastNumber + 1;
  const formattedNumber = `${code}-${String(nextNumber).padStart(3, "0")}`;
  const ticket: StoredQueueTicket = {
    id: `${code}-${Date.now()}`,
    queueCode: code,
    ticketNumber: formattedNumber,
    number: nextNumber,
    priority: queuePrioritySelect.value,
    status: "waiting",
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(ticketStorageKey, JSON.stringify([...tickets, ticket]));
  ticketNumber.textContent = formattedNumber;
  ticketDetail.textContent = `${selectedType.name ?? selectedType.nama ?? "Layanan"} • ${queuePrioritySelect.options[queuePrioritySelect.selectedIndex].text}`;
  ticketResult.hidden = false;
  queueForm?.reset();
}

queueForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (queueError) {
    queueError.textContent = "";
  }

  try {
    createTicket();
  } catch (error) {
    if (queueError) {
      queueError.textContent = error instanceof Error
        ? error.message
        : "Nomor antrian gagal dibuat. Silakan coba lagi.";
    }
  }
});

takeAnotherButton?.addEventListener("click", () => {
  if (ticketResult) {
    ticketResult.hidden = true;
  }
  queueTypeSelect?.focus();
});

renderQueueTypes();
window.setInterval(renderQueueTypes, 2500);
