import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateOffer, parseOffer } from "./engine.js";

const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("parseOffer lê valor, km e minutos", () => {
  const { offer, missing } = parseOffer("R$ 18,50\n3 min (1,2 km)\n12 min (6,8 km)");
  assert.equal(offer.fare, 18.5);
  assert.equal(offer.pickupKm, 1.2);
  assert.equal(offer.tripKm, 6.8);
  assert.equal(offer.pickupMin, 3);
  assert.equal(offer.tripMin, 12);
  assert.deepEqual(missing, []);
});

test("parseOffer tolera 'RS' no lugar de 'R$' (erro comum de OCR)", () => {
  const { offer } = parseOffer("RS 22,00\n4 min (1,5 km)\n10 min (5,0 km)");
  assert.equal(offer.fare, 22);
  assert.equal(offer.tripKm, 5);
});

test("parseOffer com um só km trata como viagem e acusa faltas", () => {
  const { offer, missing } = parseOffer("R$ 1.234,50 em 8 km");
  assert.equal(offer.fare, 1234.5);
  assert.equal(offer.tripKm, 8);
  assert.equal(offer.pickupKm, 0);
  assert.deepEqual(missing, []);
  assert.deepEqual(parseOffer("sem nada").missing, ["fare", "tripKm"]);
});

// Texto reconstruído do print real do InDrive (valor R$ 14, 2 km até o passageiro, 5,2 km de viagem).
const INDRIVE_FULL = [
  "Pedido de viagem", "JARDIM REAL", "494", "5 min", "2 km", "BELA VISTA", "9 min", "5,2 km",
  "R$ 1,9/km ~2 km", "R$ 14", "Ana", "4,82 (61)", "Agora mesmo",
  "Aceitar por R$ 14", "Sugira sua tarifa", "R$ 15,50 R$ 17 R$ 18,50 24", "Pular",
].join("\n");

test("InDrive: lê valor, caixas do mapa e ignora contrapropostas", () => {
  const { offer, missing, notes } = parseOffer(INDRIVE_FULL);
  assert.equal(offer.fare, 14);
  assert.equal(offer.pickupKm, 2);
  assert.equal(offer.pickupMin, 5);
  assert.equal(offer.tripKm, 5.2);
  assert.equal(offer.tripMin, 9);
  assert.deepEqual(missing, []);
  assert.deepEqual(notes, []);
});

test("InDrive: resultado do print real com o modelo de custos", () => {
  // Custos: 0,75/km (ver engine.test.js). 7,2 km -> 5,40; lucro real = 14 - 5,40 = 8,60
  const S = {
    fuelPrice: 6, kmPerLiter: 12, carValue: 48000, depreciationPctYear: 10, kmPerMonth: 4000,
    maintenanceMonth: 400, insuranceIpvaMonth: 200, financingMonth: 0,
    idleKmPct: 0, idleTimePct: 0, platformFeePct: 0, taxReservePct: 0,
    minPerKm: 1.5, minPerHour: 25, avgSpeedKmh: 25,
  };
  const r = calculateOffer(parseOffer(INDRIVE_FULL).offer, S);
  close(r.effKm, 7.2);
  close(r.totalMin, 14);
  close(r.net, 8.6);
  close(r.perKm, 1.194, 0.005);
  close(r.perHour, 36.86, 0.05);
  assert.equal(r.verdict, "marginal");
});

test("InDrive: caixa verde não lida -> estima a viagem pelo R$/km", () => {
  const text = INDRIVE_FULL.replace("9 min\n5,2 km", "");
  const { offer, missing, notes } = parseOffer(text);
  assert.equal(offer.fare, 14);
  assert.equal(offer.pickupKm, 2);
  assert.ok(offer.tripKm >= 5.0 && offer.tripKm <= 5.6, `tripKm=${offer.tripKm}`);
  assert.deepEqual(missing, []);
  assert.equal(notes.length, 1);
});

test("InDrive: só o painel de baixo (sem mapa) ainda funciona", () => {
  const { offer, missing } = parseOffer("R$ 1,9/km ~2 km\nR$ 14\nAceitar por R$ 14\nSugira sua tarifa\nR$ 15,50");
  assert.equal(offer.fare, 14);
  assert.equal(offer.pickupKm, 2);
  assert.ok(offer.tripKm > 5 && offer.tripKm < 5.6);
  assert.deepEqual(missing, []);
});

test("InDrive: sem 'Aceitar por', o valor é o primeiro R$ que não é R$/km nem contraproposta", () => {
  const { offer } = parseOffer("R$ 1,9/km ~2 km\nR$ 14\nSugira sua tarifa\nR$ 15,50 R$ 17");
  assert.equal(offer.fare, 14);
});

test("InDrive: 'RS' no botão de aceitar", () => {
  assert.equal(parseOffer("5 min 2 km\n9 min 5,2 km\nAceitar por RS 14").offer.fare, 14);
});
