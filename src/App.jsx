import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS, calculateOffer, costPerKm, parseOffer, settingsWarnings } from "./engine.js";
import { recognizeImage } from "./ocr.js";
import { calculateCounterOffer } from "./engine.js";

const EXAMPLE_TEXT = "5 min\n2 km\n9 min\n5,2 km\nR$ 1,9/km ~2 km\nR$ 14\nAceitar por R$ 14\nSugira sua tarifa\nR$ 15,50 R$ 17 R$ 18,50";

const SETTINGS_KEY = "gigu.settings.v2";

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const one = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const SETTING_GROUPS = [
  {
    title: "Seu carro",
    fields: [
      ["carValue", "Valor do carro (R$)", "500"],
      ["depreciationPctYear", "Depreciação (% ao ano)", "0.5"],
      ["kmPerMonth", "Km rodados por mês", "100"],
      ["kmPerLiter", "Consumo (km/L)", "0.1"],
      ["fuelPrice", "Combustível (R$/L)", "0.01"],
      ["maintenanceMonth", "Manutenção (R$/mês)", "10"],
      ["insuranceIpvaMonth", "Seguro + IPVA + licenciamento (R$/mês)", "10"],
      ["financingMonth", "Parcela do financiamento ou aluguel (R$/mês)", "10"],
    ],
    hint: "Se preencher a parcela ou o aluguel, a depreciação não é somada (a parcela já paga o carro). Para carro alugado, a parcela é o aluguel.",
  },
  {
    title: "Sua rotina",
    fields: [
      ["idleKmPct", "Km vazios entre corridas (% extra)", "1"],
      ["idleTimePct", "Tempo parado entre corridas (% extra)", "1"],
      ["avgSpeedKmh", "Velocidade média (km/h)", "1"],
    ],
    hint: "Meça no seu histórico: quanto você roda e espera, além da corrida em si, para cada corrida feita.",
  },
  {
    title: "Plataforma e imposto",
    fields: [
      ["platformFeePct", "Taxa da plataforma (%)", "0.5"],
      ["taxReservePct", "Reserva para imposto (%)", "1"],
    ],
    hint: "Veja a taxa no extrato do seu app. Para a reserva de imposto, consulte um contador.",
  },
  {
    title: "Suas metas (lucro real)",
    fields: [
      ["minPerKm", "Meta (R$/km)", "0.1"],
      ["minPerHour", "Meta (R$/hora)", "1"],
    ],
  },
];

const OFFER_FIELDS = [
  ["fare", "Valor da oferta (R$)", "0.01"],
  ["pickupKm", "Km até o passageiro", "0.1"],
  ["tripKm", "Km da viagem", "0.1"],
  ["pickupMin", "Min até o passageiro", "1"],
  ["tripMin", "Min da viagem", "1"],
];

const VERDICT = {
  good: { label: "Vale a pena", cls: "good" },
  marginal: { label: "No limite", cls: "marginal" },
  bad: { label: "Não compensa", cls: "bad" },
};

function Field({ label, step, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [offer, setOffer] = useState({ fare: 0, pickupKm: 0, tripKm: 0, pickupMin: 0, tripMin: 0 });
  const [ocrText, setOcrText] = useState("");
  const [parseNote, setParseNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* armazenamento indisponível: segue sem salvar */
    }
  }, [settings]);

  const result = useMemo(() => calculateOffer(offer, settings), [offer, settings]);
  const costs = useMemo(() => costPerKm(settings), [settings]);
  const warnings = useMemo(() => settingsWarnings(settings), [settings]);
  
  // CORREÇÃO: Variável counter movida para dentro do componente App
  const counter = useMemo(() => calculateCounterOffer(offer, settings), [offer, settings]);

  function applyText(text) {
    const { offer: parsed, missing, notes } = parseOffer(text);
    setOffer(parsed);
    const head = missing.length
      ? "Não encontrei todos os dados. Confira o texto lido e complete os campos que faltam."
      : "Dados lidos. Confira os valores antes de decidir.";
    setParseNote([head, ...notes].join(" "));
  }

  async function onPickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setParseNote("Lendo o print... na primeira vez pode demorar, pois baixa o leitor de texto.");
    try {
      const text = await recognizeImage(file, setProgress);
      setOcrText(text);
      applyText(text);
    } catch {
      setParseNote("Não consegui ler o print. Na primeira leitura é preciso internet. Tente de novo ou digite os valores.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>GigU</h1>
        <p>Copiloto para motoristas de app</p>
      </header>

      {warnings.length > 0 && (
        <div className="warn">
          <strong>Campos zerados deixam o lucro maior do que ele é de verdade:</strong>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="layout">
        <section className="card">
          <h2>Oferta</h2>
          <div className="grid">
            {OFFER_FIELDS.map(([key, label, step]) => (
              <Field key={key} label={label} step={step} value={offer[key]} onChange={(v) => setOffer({ ...offer, [key]: v })} />
            ))}
          </div>

          <label className={`pick ${busy ? "disabled" : ""}`}>
            {busy ? `Lendo... ${Math.round(progress * 100)}%` : "Ler print da oferta"}
            <input type="file" accept="image/*" onChange={onPickImage} disabled={busy} hidden />
          </label>
          {parseNote && <p className="note">{parseNote}</p>}

          <details open={ocrText !== ""}>
            <summary>Texto lido (confira ou cole aqui)</summary>
            <textarea
              rows={4}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder="Cole aqui o texto da oferta"
            />
            <div className="row">
              <button type="button" disabled={!ocrText.trim()} onClick={() => applyText(ocrText)}>Preencher campos</button>
              <button type="button" className="ghost" onClick={() => { setOcrText(EXAMPLE_TEXT); applyText(EXAMPLE_TEXT); }}>
                Usar exemplo
              </button>
            </div>
          </details>
        </section>

        <section className="card result">
  <h2>Análise Instantânea da Corrida</h2>
  {result ? (
    <>
      <div className={`verdict ${VERDICT[result.verdict].cls}`}>
        {VERDICT[result.verdict].label}
      </div>
      <div className="big">{brl(result.net)}</div>
      <p className="muted">lucro real estimado na corrida</p>

      {/* Dica de Contraproposta Inteligente */}
      {result.verdict !== "good" && counter && (
        <div className="warn" style={{ marginTop: '12px', background: '#1c2636', borderColor: '#4f8cff', color: '#4f8cff' }}>
          <strong>💡 Sugestão de Contraproposta no inDrive:</strong>
          <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 'bold' }}>
            Peça pelo menos <strong>{brl(counter.precoIdeal)}</strong> para atingir sua meta de lucro.
          </p>
        </div>
      )}

      <dl>
        <div><dt>Lucro por km</dt><dd>{brl(result.perKm)}</dd></div>
        <div><dt>Lucro por hora</dt><dd>{brl(result.perHour)}</dd></div>
        <div><dt>Distância total (com vazio)</dt><dd>{one(result.effKm)} km</dd></div>
      </dl>
    </>
  ) : (
    <p className="muted">Aguardando captura ou leitura da oferta do inDrive...</p>
  )}
</section>

        <section className="card">
          <h2>Seus custos e metas</h2>

          <div className="breakdown">
            <strong>Seu custo por km: {brl(costs.total)}</strong>
            <span>
              combustível {brl(costs.fuel)} · manutenção {brl(costs.maintenance)} · depreciação {brl(costs.depreciation)} ·
              seguro/IPVA {brl(costs.insuranceIpva)} · parcela/aluguel {brl(costs.financing)}
            </span>
            <small>Referência de um artigo: R$ 0,55 a R$ 0,85 por km para um carro popular rodando 4.000 km por mês.</small>
          </div>

          {SETTING_GROUPS.map((group) => (
            <div key={group.title} className="group">
              <h3>{group.title}</h3>
              <div className="grid">
                {group.fields.map(([key, label, step]) => (
                  <Field key={key} label={label} step={step} value={settings[key]} onChange={(v) => setSettings({ ...settings, [key]: v })} />
                ))}
              </div>
              {group.hint && <p className="note">{group.hint}</p>}
            </div>
          ))}

          <button type="button" className="ghost" onClick={() => setSettings(DEFAULT_SETTINGS)}>Restaurar padrões</button>
        </section>
      </div>
    </main>
  );
}