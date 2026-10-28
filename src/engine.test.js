import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateOffer, costPerKm, settingsWarnings, DEFAULT_SETTINGS } from "./engine.js";

const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// Configuração com números redondos para conferir à mão:
//   combustível 6/12 = 0,50/km ; manutenção 400/4000 = 0,10/km
//   depreciação 48000 x 10% / 12 = 400/mês = 0,10/km ; seguro+IPVA 200/mês = 0,05/km
//   variável = 0,60/km ; fixo = 0,15/km ; total = 0,75/km
const S = {
  fuelPrice: 6, kmPerLiter: 12, carValue: 48000, depreciationPctYear: 10, kmPerMonth: 4000,
  maintenanceMonth: 400, insuranceIpvaMonth: 200, financingMonth: 0,
  idleKmPct: 0, idleTimePct: 0, platformFeePct: 0, taxReservePct: 0,
  minPerKm: 1.5, minPerHour: 25, avgSpeedKmh: 25,
};

test("custo por km soma combustível, manutenção, depreciação e seguro/IPVA", () => {
  const c = costPerKm(S);
  close(c.fuel, 0.5);
  close(c.maintenance, 0.1);
  close(c.depreciation, 0.1);
  close(c.insuranceIpva, 0.05);
  close(c.variable, 0.6);
  close(c.fixed, 0.15);
  close(c.total, 0.75);
});

test("com parcela/aluguel a depreciação não é somada (evita contar o carro duas vezes)", () => {
  const c = costPerKm({ ...S, financingMonth: 800 });
  close(c.depreciation, 0);
  close(c.financing, 0.2);
  close(c.fixed, 0.25);
  close(c.total, 0.85);
});

test("lucro real e lucro de caixa de uma corrida", () => {
  // 10 km: combustível 5,00 + manutenção 1,00 (variáveis) + fixos 1,50
  const r = calculateOffer({ fare: 20, pickupKm: 2, tripKm: 8, pickupMin: 5, tripMin: 15 }, S);
  close(r.fuelCost, 5);
  close(r.maintenance, 1);
  close(r.fixedShare, 1.5);
  close(r.netCash, 14);
  close(r.net, 12.5);
  close(r.perKm, 1.25);
  close(r.perHour, 37.5);
  assert.equal(r.verdict, "marginal"); // 1,25/km está abaixo da meta de 1,50, mas acima de 70% dela
});

test("km vazios entre corridas aumentam os custos", () => {
  // 50% de km extras: 15 km efetivos -> custos 0,75 x 15 = 11,25
  const r = calculateOffer({ fare: 20, pickupKm: 2, tripKm: 8, pickupMin: 5, tripMin: 15 }, { ...S, idleKmPct: 50 });
  close(r.effKm, 15);
  close(r.net, 8.75);
});

test("tempo parado entre corridas reduz o lucro por hora", () => {
  const r = calculateOffer({ fare: 20, pickupKm: 2, tripKm: 8, pickupMin: 5, tripMin: 15 }, { ...S, idleTimePct: 100 });
  close(r.effMin, 40);
  close(r.perHour, 18.75);
});

test("taxa da plataforma e reserva de imposto", () => {
  const r = calculateOffer({ fare: 20, pickupKm: 1, tripKm: 5 }, { ...S, platformFeePct: 10, taxReservePct: 10 });
  close(r.fee, 2);
  close(r.taxReserve, 1.8); // 10% de (20 - 2)
});

test("vereditos: bom, ruim, e ruim quando nem os custos variáveis são pagos", () => {
  assert.equal(calculateOffer({ fare: 30, pickupKm: 1, tripKm: 8, pickupMin: 4, tripMin: 18 }, S).verdict, "good");
  assert.equal(calculateOffer({ fare: 8, pickupKm: 4, tripKm: 6, pickupMin: 10, tripMin: 20 }, S).verdict, "bad");
  const r = calculateOffer({ fare: 5, pickupKm: 2, tripKm: 8 }, S); // variáveis = 6,00 > 5,00
  assert.ok(r.netCash < 0);
  assert.equal(r.verdict, "bad");
});

test("sem valor ou distância retorna null", () => {
  assert.equal(calculateOffer({ fare: 10, pickupKm: 0, tripKm: 0 }, S), null);
  assert.equal(calculateOffer({ fare: 0, pickupKm: 1, tripKm: 3 }, S), null);
});

test("estima minutos pela velocidade média", () => {
  const r = calculateOffer({ fare: 20, pickupKm: 5, tripKm: 5 }, { ...S, avgSpeedKmh: 20 });
  close(r.totalMin, 30);
});

test("avisa sobre campos zerados que inflam o lucro", () => {
  assert.equal(settingsWarnings(DEFAULT_SETTINGS).length, 3);
  assert.equal(settingsWarnings({ ...S, idleKmPct: 20, idleTimePct: 20 }).length, 0);
  assert.equal(settingsWarnings({ ...S, kmPerMonth: 0, idleKmPct: 20, idleTimePct: 20 }).length, 1);
});
