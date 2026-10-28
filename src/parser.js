// Leitor de texto de OCR para a tela "Pedido de viagem" do InDrive.
//
// Layout observado (um print real):
//   mapa:   "5 min 2 km" (caixa azul, até o passageiro) e "9 min 5,2 km" (caixa verde, a viagem)
//   painel: "R$ 1,9/km  ~2 km" / "R$ 14" / ... / "Aceitar por R$ 14" / "Sugira sua tarifa" / contrapropostas
//
// O "R$ 1,9/km" bate com valor / (km até o passageiro + km da viagem): 14 / 7,2 = 1,94.
// Isso foi conferido em um único print, então é uma hipótese; por isso só usamos para
// estimar o que o OCR não leu e para avisar quando os números não batem.

const MONEY = String.raw`R\s?[$S5]\s*`; // o OCR costuma ler "R$" como "RS" ou "R5"
const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const AMOUNT = String.raw`([\d.]*\d(?:,\d{1,2})?)`;

// "1.234,56" -> 1234.56 ; "12,5" -> 12.5 ; "3.2" -> 3.2
export function parseBR(str) {
  let t = String(str).trim();
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return Number(t);
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Retorna { offer, missing, notes }.
 * - offer: { fare, pickupKm, tripKm, pickupMin, tripMin } (0 quando não achou)
 * - missing: campos essenciais que faltaram ("fare", "tripKm")
 * - notes: avisos em português para mostrar ao motorista
 */
export function parseOffer(text) {
  const src = String(text || "");
  const notes = [];

  // Depois de "Sugira sua tarifa" vêm as contrapropostas (R$ 15,50, R$ 17...), não a oferta.
  const cut = src.search(/sugira/i);
  const main = cut > 0 ? src.slice(0, cut) : src;

  // "R$ 1,9/km ~2 km": R$ por km mostrado pelo app e a distância até o passageiro.
  const perKmMatch = main.match(
    new RegExp(String.raw`${MONEY}${NUM}\s*/\s*km(?:\s*[~≈\-–—]?\s*${NUM}\s*km)?`, "i")
  );
  const perKm = perKmMatch ? parseBR(perKmMatch[1]) : 0;
  const hint = perKmMatch && perKmMatch[2] ? parseBR(perKmMatch[2]) : 0;

  // Valor: o botão "Aceitar por R$ X" é o trecho mais confiável.
  let fare = 0;
  const accept = src.match(new RegExp(String.raw`aceitar\s+por\s*(?:${MONEY})?${AMOUNT}`, "i"));
  if (accept) {
    fare = parseBR(accept[1]);
  } else {
    const noPerKm = main.replace(new RegExp(String.raw`${MONEY}${NUM}\s*/\s*km`, "gi"), " ");
    const money = noPerKm.match(new RegExp(String.raw`${MONEY}${AMOUNT}`, "i"));
    if (money) fare = parseBR(money[1]);
  }

  // Caixas do mapa: "5 min 2 km" e "9 min 5,2 km".
  const pairs = [];
  for (const m of main.matchAll(new RegExp(String.raw`(\d+)\s*min\D{0,4}?${NUM}\s*km`, "gi"))) {
    const p = { min: Number(m[1]), km: parseBR(m[2]) };
    if (!pairs.some((q) => q.min === p.min && q.km === p.km)) pairs.push(p);
  }

  let pickup = null;
  let trip = null;
  if (pairs.length >= 2) {
    if (hint) {
      // A caixa cuja distância mais se aproxima do "~x km" é a do passageiro.
      let idx = 0;
      pairs.forEach((p, i) => {
        if (Math.abs(p.km - hint) < Math.abs(pairs[idx].km - hint)) idx = i;
      });
      pickup = pairs[idx];
      trip = pairs.find((_, i) => i !== idx);
    } else {
      pickup = pairs[0];
      trip = pairs[1];
    }
  } else if (pairs.length === 1) {
    const p = pairs[0];
    if (hint && Math.abs(p.km - hint) <= 0.6) pickup = p;
    else trip = p;
  } else if (!hint) {
    // Sem caixas de mapa nem "~x km": usa qualquer "x km" solto (1º passageiro, 2º viagem; um só = viagem).
    const kms = [...main.matchAll(new RegExp(String.raw`${NUM}\s*km`, "gi"))].map((m) => parseBR(m[1]));
    if (kms.length >= 2) {
      pickup = { min: 0, km: kms[0] };
      trip = { min: 0, km: kms[1] };
    } else if (kms.length === 1) {
      trip = { min: 0, km: kms[0] };
    }
  }

  const pickupKm = pickup ? pickup.km : hint;
  const pickupMin = pickup ? pickup.min : 0;
  let tripKm = trip ? trip.km : 0;
  const tripMin = trip ? trip.min : 0;

  // Conferência / estimativa pelo R$/km da tela (arredondado em 0,1, então ~±2,5% de erro).
  const expectedTotal = fare && perKm ? fare / perKm : 0;
  if (trip && expectedTotal) {
    const total = pickupKm + tripKm;
    if (Math.abs(total - expectedTotal) / expectedTotal > 0.12) {
      notes.push("Os km lidos não batem com o R$/km mostrado na tela. Confira as distâncias.");
    }
  } else if (!trip && expectedTotal) {
    const est = round1(expectedTotal - pickupKm);
    if (est > 0) {
      tripKm = est;
      notes.push(
        `Não consegui ler a distância da viagem. Estimei ${String(est).replace(".", ",")} km pelo R$/km da tela (erro de cerca de 0,2 km). Confira.`
      );
    }
  }

  const offer = { fare, pickupKm, tripKm, pickupMin, tripMin };
  const missing = [];
  if (!offer.fare) missing.push("fare");
  if (!offer.tripKm) missing.push("tripKm");
  return { offer, missing, notes };
}
