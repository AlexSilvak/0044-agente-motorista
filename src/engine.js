// Motor de cálculo do GigU. Sem dependências: roda igual no navegador, iOS e Android.
//
// Modelo (baseado em fontes brasileiras sobre custo do motorista de app):
//   custo por km = combustível + manutenção + depreciação + seguro/IPVA + parcela/aluguel
//   - combustível    = preço do litro ÷ consumo (km/L)
//   - os demais      = valor mensal ÷ km rodados por mês
//   - depreciação    = valor do carro × % ao ano ÷ 12
// Os km e o tempo da corrida são aumentados pelos "vazios" entre corridas (percentuais
// informados pelo motorista), porque esses km também gastam combustível e desgaste.
//
// Duas medidas de lucro:
//   netCash = oferta - taxa - imposto - custos variáveis (combustível + manutenção)
//   net     = netCash - parte dos custos fixos (depreciação, seguro/IPVA, parcela)   <- lucro real

export const DEFAULT_SETTINGS = {
  // Seu carro (valores iniciais são exemplos: preencha com os do seu carro)
  carValue: 45000, // R$
  depreciationPctYear: 10, // % do valor do carro por ano
  kmPerMonth: 4000, // km rodados por mês (com e sem passageiro)
  kmPerLiter: 12,
  fuelPrice: 6.2, // R$ por litro
  maintenanceMonth: 350, // R$ por mês (óleo, pneus, revisões, reparos)
  insuranceIpvaMonth: 0, // R$ por mês (seguro + IPVA + licenciamento)
  financingMonth: 0, // R$ por mês (parcela de financiamento ou aluguel)
  // Sua rotina
  idleKmPct: 0, // % de km vazios extras entre corridas, sobre os km da corrida
  idleTimePct: 0, // % de tempo parado extra entre corridas, sobre o tempo da corrida
  avgSpeedKmh: 25, // usado quando a oferta não informa minutos
  // Plataforma e imposto
  platformFeePct: 0, // % que a plataforma retém da oferta
  taxReservePct: 0, // % do que sobra da oferta reservado para imposto
  // Metas de lucro REAL
  minPerKm: 1.5,
  minPerHour: 25,
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Custo por km do seu carro, separado por item.
 * Se houver parcela de financiamento/aluguel, a depreciação NÃO é somada: a parcela já
 * paga o carro, e somar as duas contaria o mesmo custo duas vezes.
 */
export function costPerKm(settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const km = num(s.kmPerMonth);
  const perKm = (monthly) => (km > 0 ? monthly / km : 0);

  const fuel = num(s.kmPerLiter) > 0 ? num(s.fuelPrice) / num(s.kmPerLiter) : 0;
  const maintenance = perKm(num(s.maintenanceMonth));
  const financing = perKm(num(s.financingMonth));
  const depreciation =
    num(s.financingMonth) > 0 ? 0 : perKm((num(s.carValue) * num(s.depreciationPctYear)) / 100 / 12);
  const insuranceIpva = perKm(num(s.insuranceIpvaMonth));

  const variable = fuel + maintenance;
  const fixed = depreciation + insuranceIpva + financing;
  return { fuel, maintenance, depreciation, insuranceIpva, financing, variable, fixed, total: variable + fixed };
}

/** Campos zerados que deixam o lucro maior do que ele é de verdade. */
export function settingsWarnings(settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const out = [];
  if (num(s.kmPerMonth) <= 0) out.push("Km por mês precisa ser maior que zero, senão os custos mensais não entram na conta.");
  if (num(s.insuranceIpvaMonth) <= 0) out.push("Seguro + IPVA + licenciamento está em R$ 0.");
  if (num(s.idleKmPct) <= 0) out.push("Km vazios entre corridas está em 0%.");
  if (num(s.idleTimePct) <= 0) out.push("Tempo parado entre corridas está em 0%.");
  return out;
}

/**
 * offer: { fare, pickupKm, tripKm, pickupMin?, tripMin? }
 * Retorna null se não houver valor ou distância para calcular.
 */
export function calculateOffer(offer, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const fare = num(offer.fare);
  const pickupKm = num(offer.pickupKm);
  const tripKm = num(offer.tripKm);
  const totalKm = pickupKm + tripKm;
  if (fare <= 0 || totalKm <= 0) return null;

  const speed = s.avgSpeedKmh > 0 ? s.avgSpeedKmh : 25;
  const pickupMin = num(offer.pickupMin) || (pickupKm / speed) * 60;
  const tripMin = num(offer.tripMin) || (tripKm / speed) * 60;
  const totalMin = Math.max(pickupMin + tripMin, 1);

  const effKm = totalKm * (1 + num(s.idleKmPct) / 100);
  const effMin = totalMin * (1 + num(s.idleTimePct) / 100);

  const c = costPerKm(s);
  const fee = (fare * num(s.platformFeePct)) / 100;
  const taxReserve = ((fare - fee) * num(s.taxReservePct)) / 100;
  const fuelCost = effKm * c.fuel;
  const maintenance = effKm * c.maintenance;
  const fixedShare = effKm * c.fixed;

  const netCash = fare - fee - taxReserve - fuelCost - maintenance;
  const net = netCash - fixedShare;

  const perKm = net / effKm;
  const perHour = net / (effMin / 60);

  let verdict = "marginal";
  if (netCash <= 0) verdict = "bad"; // nem os custos variáveis a corrida paga
  else if (perKm >= s.minPerKm && perHour >= s.minPerHour) verdict = "good";
  else if (perKm < s.minPerKm * 0.7 || perHour < s.minPerHour * 0.7) verdict = "bad";

  return {
    fare, fee, taxReserve, fuelCost, maintenance, fixedShare,
    netCash, net, totalKm, effKm, totalMin, effMin, perKm, perHour, verdict,
  };
}

// O leitor de texto do OCR fica em parser.js.
export { parseOffer } from "./parser.js";
