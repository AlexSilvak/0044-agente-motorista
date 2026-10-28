import React, { useState, useEffect } from 'react';
import { 
  Car, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Settings, 
  Bell, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Smartphone, 
  BarChart3, 
  Calculator,
  RefreshCw,
  Sliders,
  Zap,
  Compass,
  Fuel,
  Wrench,
  PieChart,
  Sparkles,
  Camera,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Vehicle Parameters (Optimized for iPhone XS / Local Engine)
  const [settings, setSettings] = useState({
    fuelPrice: 5.89,        // R$ per liter
    fuelConsumption: 11.5,  // km per liter
    maintenanceCost: 0.35,  // R$ per km
    depreciationRate: 0.15, // R$ per km
    appCommission: 9.5,     // InDrive approx percentage %
    emptyReturnFactor: 1.2, // Factor accounting for return trip distance
    hourlyGoal: 35.00,      // Desired hourly net profit in R$
    dailyTarget: 250.00     // Daily revenue goal
  });

  // Daily Statistics State
  const [stats, setStats] = useState({
    todayRevenue: 214.00,
    todayExpenses: 48.60,
    todayProfit: 165.40,
    hoursWorked: 4.0,
    totalRidesAnalyzed: 42,
    acceptedRides: 27,
    rejectedRides: 15,
    acceptanceRate: 64
  });

  // Simulated InDrive Rides for OCR Capture Simulator
  const [ridesQueue, setRidesQueue] = useState([
    {
      id: 1,
      passenger: 'Juliana Mendes',
      rating: 4.92,
      origin: 'Av. Afonso Pena, 1500 - Centro',
      destination: 'Shopping Pátio Savassi',
      distanceKm: 6.8,
      durationMin: 15,
      offeredPrice: 28.00,
      paymentMethod: 'Pix / Dinheiro',
      platform: 'InDrive'
    },
    {
      id: 2,
      passenger: 'Roberto Carlos',
      rating: 4.71,
      origin: 'Rua Tupis, 400 - Centro',
      destination: 'Bairro Buritis - Câmpus',
      distanceKm: 9.5,
      durationMin: 24,
      offeredPrice: 22.00,
      paymentMethod: 'Dinheiro',
      platform: 'InDrive'
    },
    {
      id: 3,
      passenger: 'Camila Souza',
      rating: 4.98,
      origin: 'Savassi - Prédio Comercial',
      destination: 'Aeroporto da Pampulha',
      distanceKm: 12.4,
      durationMin: 26,
      offeredPrice: 42.50,
      paymentMethod: 'App / Cartão',
      platform: 'InDrive'
    }
  ]);

  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isCapturingOCR, setIsCapturingOCR] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('Pronto para captura');

  // History Log of Decisions
  const [recentDecisions, setRecentDecisions] = useState([
    { id: 101, dest: 'Savassi', netProfit: 21.30, verdict: 'LUCRATIVA', time: '15:10', km: 6.8 },
    { id: 102, dest: 'Buritis', netProfit: 4.10, verdict: 'RECUSAR', time: '14:42', km: 9.5 },
    { id: 103, dest: 'Pampulha', netProfit: 31.00, verdict: 'LUCRATIVA', time: '13:55', km: 12.4 }
  ]);

  // Manual Calculator State
  const [manualCalc, setManualCalc] = useState({
    distance: '8.5',
    price: '26.00',
    duration: '18'
  });

  // Parametric Local Calculation Engine (Zero Cloud Latency)
  const calculateRideMetrics = (distanceKm, offeredPrice, durationMin) => {
    const dist = parseFloat(distanceKm) || 0;
    const price = parseFloat(offeredPrice) || 0;
    const duration = parseFloat(durationMin) || 0;

    // Total distance accounting for approach & empty return adjustment
    const adjustedKm = dist * settings.emptyReturnFactor;
    
    // Fuel cost per km
    const fuelCostPerKm = settings.fuelPrice / settings.fuelConsumption;
    
    // Total operational cost per km (Fuel + Maintenance + Depreciation)
    const totalCostPerKm = fuelCostPerKm + settings.maintenanceCost + settings.depreciationRate;
    
    // App Commission discount
    const commissionDiscount = price * (settings.appCommission / 100);
    const grossAfterCommission = price - commissionDiscount;

    // Total cost
    const estimatedCost = adjustedKm * totalCostPerKm;
    
    // Net Profit
    const netProfit = grossAfterCommission - estimatedCost;
    
    // Profit per Km and per Hour
    const profitPerKm = dist > 0 ? netProfit / dist : 0;
    const hours = duration / 60;
    const profitPerHour = hours > 0 ? netProfit / hours : 0;

    // Decision Logic: Profitable if hourly rate >= goal OR net profit per km >= R$ 2.20
    const isProfitable = profitPerHour >= settings.hourlyGoal || profitPerKm >= 2.25;

    return {
      adjustedKm: adjustedKm.toFixed(1),
      estimatedCost: estimatedCost.toFixed(2),
      netProfit: netProfit.toFixed(2),
      profitPerKm: profitPerKm.toFixed(2),
      profitPerHour: profitPerHour.toFixed(2),
      verdict: isProfitable ? '✅ LUCRATIVA' : '⚠️ RECUSAR',
      isProfitable
    };
  };

  const activeOffer = ridesQueue[currentQueueIndex];
  const activeMetrics = calculateRideMetrics(activeOffer.distanceKm, activeOffer.offeredPrice, activeOffer.durationMin);

  // Simulated Native iOS OCR Capture Trigger (Optimized for Apple A12 Chip)
  const triggerNativeOCR = () => {
    setIsCapturingOCR(true);
    setOcrStatusText('Lendo buffer de tela (Apple Vision OCR)...');
    
    setTimeout(() => {
      setOcrStatusText('Extração concluída em 14ms!');
      setTimeout(() => {
        setIsCapturingOCR(false);
        setOcrStatusText('Pronto para captura');
      }, 800);
    }, 450);
  };

  // Handle Driver Action (Accept / Reject)
  const handleDecision = (accepted) => {
    const netP = parseFloat(activeMetrics.netProfit);

    setStats(prev => ({
      ...prev,
      todayRevenue: accepted ? prev.todayRevenue + activeOffer.offeredPrice : prev.todayRevenue,
      todayExpenses: accepted ? prev.todayExpenses + parseFloat(activeMetrics.estimatedCost) : prev.todayExpenses,
      todayProfit: accepted ? prev.todayProfit + netP : prev.todayProfit,
      totalRidesAnalyzed: prev.totalRidesAnalyzed + 1,
      acceptedRides: accepted ? prev.acceptedRides + 1 : prev.acceptedRides,
      rejectedRides: !accepted ? prev.rejectedRides + 1 : prev.rejectedRides,
      acceptanceRate: Math.round(((accepted ? stats.acceptedRides + 1 : stats.acceptedRides) / (stats.totalRidesAnalyzed + 1)) * 100)
    }));

    const newLog = {
      id: Date.now(),
      dest: activeOffer.destination.split(' - ')[0],
      netProfit: netP,
      verdict: activeMetrics.isProfitable ? 'LUCRATIVA' : 'RECUSAR',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      km: activeOffer.distanceKm
    };

    setRecentDecisions([newLog, ...recentDecisions.slice(0, 5)]);
    setCurrentQueueIndex((prev) => (prev + 1) % ridesQueue.length);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-2 sm:p-4 select-none">
      
      {/* iOS App Shell Container (iPhone Style Frame) */}
      <div className="w-full max-w-md bg-slate-900 border-4 border-slate-800 rounded-[48px] shadow-2xl overflow-hidden flex flex-col relative h-[900px] max-h-[96vh]">
        
        {/* iPhone Dynamic Island / Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-6 w-36 bg-slate-950 rounded-b-2xl z-50 flex items-center justify-center shadow-md">
          <div className="w-12 h-1 bg-slate-800 rounded-full mb-1"></div>
        </div>

        {/* Status Bar */}
        <div className="pt-3 px-6 pb-2 bg-slate-950/95 backdrop-blur flex justify-between items-center text-xs text-slate-400 z-40 border-b border-slate-800/80">
          <span className="font-bold text-slate-200">09:41</span>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-emerald-400 font-bold tracking-wide">iPhone XS • Chip A12 Local</span>
            <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
              <div className="h-full w-4/5 bg-emerald-400 rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* App Header Branding */}
        <div className="px-5 pt-3 pb-2.5 bg-slate-950 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                GigU <span className="text-emerald-400 text-[10px] uppercase px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-800 rounded">iOS Híbrido</span>
              </h1>
              <p className="text-[10px] text-slate-400">Copiloto Inteligente para InDrive</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('capture')}
            className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 animate-pulse"
          >
            <Camera className="w-3.5 h-3.5" /> OCR Ao Vivo
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto pb-20 pt-3 px-4 scrollbar-thin scrollbar-thumb-slate-700 space-y-4">
          
          {/* TAB 1: DASHBOARD GERAL */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Daily Earnings Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl relative overflow-hidden shadow-xl">
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      Balanço de Hoje (Líquido)
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">R$ {stats.todayProfit.toFixed(2)}</h2>
                    <p className="text-xs text-slate-300 mt-0.5">{stats.hoursWorked}h trabalhadas • A12 Bionic Ativo</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Meta {Math.round((stats.todayProfit / settings.dailyTarget) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.todayProfit / settings.dailyTarget) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Bruto: R$ {stats.todayRevenue.toFixed(2)}</span>
                  <span>Custos: R$ {stats.todayExpenses.toFixed(2)}</span>
                  <span>Meta: R$ {settings.dailyTarget}</span>
                </div>
              </div>

              {/* Quick Simulator Banner */}
              <div 
                onClick={() => setActiveTab('capture')}
                className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-500/40 p-3.5 rounded-2xl cursor-pointer hover:border-teal-400 transition group shadow-lg flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 group-hover:scale-105 transition">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1">
                      Capturar Tela InDrive <span className="text-[9px] bg-teal-500 text-slate-950 px-1.5 py-0.2 rounded font-extrabold">OCR</span>
                    </h3>
                    <p className="text-[11px] text-slate-300">Simular sobreposição de tela no iPhone XS</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition" />
              </div>

              {/* Quick Analytics Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl shadow-inner">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-medium">Corridas Analisadas</span>
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-white">{stats.totalRidesAnalyzed}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    <span className="text-emerald-400 font-semibold">{stats.acceptanceRate}%</span> aceitação
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl shadow-inner">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-medium">Prejuízos Evitados</span>
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-xl font-bold text-white">{stats.rejectedRides}</div>
                  <div className="text-[10px] text-teal-400 mt-0.5">Furpadas rejeitadas</div>
                </div>
              </div>

              {/* Recent Decisions Log */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Histórico de Decisões</h3>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Motor Local
                  </span>
                </div>
                <div className="space-y-2">
                  {recentDecisions.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-2 h-2 rounded-full ${item.verdict === 'LUCRATIVA' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{item.dest} <span className="text-[10px] text-slate-400">({item.km} km)</span></p>
                          <span className="text-[10px] text-slate-400">{item.time}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400">+R$ {item.netProfit.toFixed(2)}</span>
                        <span className={`block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${item.verdict === 'LUCRATIVA' ? 'text-emerald-400 bg-emerald-950 border border-emerald-800' : 'text-rose-400 bg-rose-950 border border-rose-800'}`}>
                          {item.verdict}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SIMULADOR DE CAPTURA INDRIVE (OCR NATIVO) */}
          {activeTab === 'capture' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Simulador OCR Nativo (iOS Apple Vision)</h3>
                      <p className="text-[10px] text-slate-400">{ocrStatusText}</p>
                    </div>
                  </div>
                  <button 
                    onClick={triggerNativeOCR}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow"
                  >
                    Testar OCR
                  </button>
                </div>
              </div>

              {/* Simulated InDrive Offer Overlay */}
              {activeOffer && (
                <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/60 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
                  
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> InDrive Capturado
                  </div>

                  <div className="flex items-center space-x-2.5 mb-3 pt-1">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs">
                      {activeOffer.passenger.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{activeOffer.passenger}</h4>
                      <p className="text-[11px] text-amber-400 font-semibold">★ {activeOffer.rating} • {activeOffer.paymentMethod}</p>
                    </div>
                  </div>

                  {/* Route details */}
                  <div className="space-y-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-xs">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">ORIGEM (Embarque)</span>
                        <span className="text-slate-200 font-medium">{activeOffer.origin}</span>
                      </div>
                    </div>
                    <div className="border-l border-dashed border-slate-700 ml-2 h-3"></div>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">DESTINO</span>
                        <span className="text-slate-200 font-medium">{activeOffer.destination}</span>
                      </div>
                    </div>
                  </div>

                  {/* Offered Specs */}
                  <div className="grid grid-cols-3 gap-2 my-3 text-center">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Valor</span>
                      <span className="text-base font-extrabold text-emerald-400">R$ {activeOffer.offeredPrice.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Distância</span>
                      <span className="text-sm font-bold text-white">{activeOffer.distanceKm} km</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Tempo Est.</span>
                      <span className="text-sm font-bold text-white">{activeOffer.durationMin} min</span>
                    </div>
                  </div>

                  {/* Local Parametric Calculation Result */}
                  <div className={`p-3 rounded-2xl border mb-3 flex items-center justify-between ${activeMetrics.isProfitable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    <div>
                      <div className="flex items-center space-x-1">
                        {activeMetrics.isProfitable ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                        <span className="text-xs font-black uppercase tracking-wide">{activeMetrics.verdict}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Lucro Líquido: <strong className="text-white">R$ {activeMetrics.netProfit}</strong> ({activeMetrics.profitPerHour} R$/h)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-200">R$ {activeMetrics.profitPerKm}/km</span>
                      <span className="block text-[9px] text-slate-400">Custo: R$ {activeMetrics.estimatedCost}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleDecision(false)}
                      className="py-2.5 px-3 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rejeitar</span>
                    </button>
                    <button 
                      onClick={() => handleDecision(true)}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-900/50 transition active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aceitar Corrida</span>
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <button 
                      onClick={() => setCurrentQueueIndex((prev) => (prev + 1) % ridesQueue.length)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium flex items-center justify-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" /> Simular próxima oferta ({currentQueueIndex + 1}/{ridesQueue.length})
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: CALCULADORA MANUAL */}
          {activeTab === 'calculator' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" /> Simulador Manual Paramétrico
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Teste simulações instantâneas baseadas nas suas configurações de custo.</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Distância (Km)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={manualCalc.distance}
                    onChange={(e) => setManualCalc({...manualCalc, distance: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Valor da Corrida (R$)</label>
                  <input 
                    type="number" 
                    step="0.50"
                    value={manualCalc.price}
                    onChange={(e) => setManualCalc({...manualCalc, price: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duração Estimada (Minutos)</label>
                  <input 
                    type="number" 
                    value={manualCalc.duration}
                    onChange={(e) => setManualCalc({...manualCalc, duration: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Manual Result Calculation */}
              {(() => {
                const res = calculateRideMetrics(manualCalc.distance, manualCalc.price, manualCalc.duration);
                return (
                  <div className={`p-4 rounded-2xl border ${res.isProfitable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'} space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider">{res.verdict}</span>
                      <span className="text-sm font-black text-white">R$ {res.netProfit} Líquido</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/50 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Lucro/Km</span>
                        <span className="font-bold text-white">R$ {res.profitPerKm}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Lucro/Hora</span>
                        <span className="font-bold text-white">R$ {res.profitPerHour}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Custo Total</span>
                        <span className="font-bold text-rose-400">R$ {res.estimatedCost}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* TAB 4: CONFIGURAÇÕES DE CUSTOS (IPHONE XS / CHIP A12) */}
          {activeTab === 'settings' && (
            <div className="space-y-3.5 animate-fadeIn">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Parâmetros de Custos do Veículo
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Ajuste os valores reais para alimentar o motor local de decisão.</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Preço da Gasolina (R$ / Litro)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={settings.fuelPrice}
                    onChange={(e) => setSettings({...settings, fuelPrice: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Consumo do Carro (Km / Litro)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={settings.fuelConsumption}
                    onChange={(e) => setSettings({...settings, fuelConsumption: parseFloat(e.target.value) || 1})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Manutenção e Pneus (R$ / Km)</label>
                  <input 
                    type="number" 
                    step="0.05" 
                    value={settings.maintenanceCost}
                    onChange={(e) => setSettings({...settings, maintenanceCost: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Taxa Estimada do App InDrive (%)</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    value={settings.appCommission}
                    onChange={(e) => setSettings({...settings, appCommission: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Meta Diária de Faturamento (R$)</label>
                  <input 
                    type="number" 
                    step="10" 
                    value={settings.dailyTarget}
                    onChange={(e) => setSettings({...settings, dailyTarget: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-950/95 border-t border-slate-800 flex justify-around items-center px-1 z-40 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition ${activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Painel</span>
          </button>

          <button 
            onClick={() => setActiveTab('capture')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition ${activeTab === 'capture' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Camera className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Capturar</span>
          </button>

          <button 
            onClick={() => setActiveTab('calculator')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition ${activeTab === 'calculator' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Calculator className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Calculadora</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition ${activeTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Ajustes</span>
          </button>
        </div>

        {/* iPhone Home Indicator Bar */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full z-50 pointer-events-none"></div>

      </div>

    </div>
  );
}