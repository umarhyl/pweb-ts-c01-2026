const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const values = new Map();
const localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};
const window = { dispatchEvent() {} };
const context = vm.createContext({ localStorage, window, Event: class Event {} });
vm.runInContext(fs.readFileSync("js/queue-core.js", "utf8"), context);
const queue = context.HospitalQueue;

assert.equal(queue.services().length, 3);
queue.saveService({ code: "d", name: "Poli Anak", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 10 });
assert.throws(() => queue.saveService({ code: "D", name: "Lain", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 10 }), /sudah dipakai/);
assert.throws(() => queue.saveService({ code: "E", name: "poli anak", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 10 }), /sudah ada/);
assert.throws(() => queue.takeTicket("D", "darurat"), /Prioritas tidak dikenal/);

const normal = queue.takeTicket("D", "normal");
const vip = queue.takeTicket("D", "vip");
const disability = queue.takeTicket("D", "disabilitas");
const elderly = queue.takeTicket("D", "lansia");
assert.deepEqual(Array.from(queue.waitingTickets("D"), (ticket) => ticket.id), [vip.id, disability.id, elderly.id, normal.id]);
assert.equal(vip.ticketNumber, "D-002");
assert.equal(queue.callNext("D").id, vip.id);
assert.equal(queue.callNext("D").id, disability.id);
assert.equal(queue.tickets().find((ticket) => ticket.id === vip.id).status, "done");
assert.equal(queue.skipTicket(disability.id).status, "skipped");
assert.equal(queue.restoreSkipped(disability.id).status, "waiting");
assert.equal(queue.callNext("D").id, disability.id);
assert.equal(queue.callNext("D").id, elderly.id);
assert.equal(queue.complete("D").id, elderly.id);
assert.throws(() => queue.deleteService("D"), /Reset antrean/);
queue.setServiceActive("D", false);
assert.throws(() => queue.takeTicket("D", "normal"), /dinonaktifkan/);
queue.resetQueues();
assert.equal(queue.tickets().length, 0);
queue.deleteService("D");
queue.saveService({ code: "D", name: "Poli Anak", active: true, openTime: "00:00", closeTime: "23:59", averageMinutes: 10 });
assert.equal(queue.takeTicket("D", "normal").ticketNumber, "D-001");

console.log("Alur antrean lulus.");
