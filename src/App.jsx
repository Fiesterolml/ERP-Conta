import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, X, Sun, Moon, LayoutDashboard, Users, 
  Settings, ChevronDown, ChevronUp, 
  Search, Plus, Edit2, Trash2, Briefcase, 
  DollarSign, UserCheck, Bell, CheckCircle,
  FileSpreadsheet, Eye, AlertCircle,
  PlaneTakeoff, CalendarDays, LogOut, LogIn,
  Palmtree, TrendingUp
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// FIREBASE SETUP
// ==========================================
let app, auth, db, appId;

const myFirebaseConfig = {
  apiKey: "AIzaSyAo69pOboAkXHlzOYG3RtcRWvY6i494DZI",
  authDomain: "erp-conta.firebaseapp.com",
  projectId: "erp-conta",
  storageBucket: "erp-conta.firebasestorage.app",
  messagingSenderId: "1019862550393",
  appId: "1:1019862550393:web:7a173aea521d3875b691a8",
  measurementId: "G-E758BFM3DD"
};

try {
  const configToUse = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myFirebaseConfig;
  app = initializeApp(configToUse);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Limpieza del appId para evitar errores de segmentos en la ruta de Firestore
  const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'erp-prototype';
  appId = rawAppId.replace(/\//g, '_');
} catch (e) {
  console.error("Error inicializando Firebase:", e);
}

// ==========================================
// UTILIDADES (CÁLCULOS Y FECHAS)
// ==========================================
const generarAmortizacion = (monto, montoInteres, nroCuotas) => {
  const cuotasList = [];
  let saldoRestante = monto;
  let pagoAcumulado = 0;
  const capitalPorCuota = monto / nroCuotas;
  const interesPorCuota = montoInteres / nroCuotas;

  for (let i = 1; i <= nroCuotas; i++) {
    saldoRestante -= capitalPorCuota;
    pagoAcumulado += capitalPorCuota;
    cuotasList.push({
      numero: i,
      montoCuota: capitalPorCuota + interesPorCuota,
      interes: interesPorCuota,
      capital: capitalPorCuota,
      pagoAcumulado: pagoAcumulado,
      saldoCapital: Math.max(0, saldoRestante),
      pagado: false
    });
  }
  return cuotasList;
};

const addOneYear = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
};

const calculateDaysDiff = (start, end) => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate - startDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays > 0 ? diffDays : 0;
};

const formatFullName = (emp) => {
  if (!emp) return 'Desconocido';
  return `${emp.nombres || ''} ${emp.apellidoPaterno || ''} ${emp.apellidoMaterno || ''}`.trim() || 'Sin Nombre';
};

// ==========================================
// COMPONENTES DE UI
// ==========================================
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition-all">
    <div className={`p-4 rounded-xl ${color} shadow-lg shadow-blue-500/10`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

// ==========================================
// VISTAS DEL SISTEMA
// ==========================================

// 0. LOGIN
const LoginView = ({ onGoogle, onGuest, loading, error, darkMode, setDarkMode }) => (
  <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300 ${darkMode ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
    <div className="absolute top-6 right-6">
       <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm text-gray-500 hover:scale-110 transition-transform">
         {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
       </button>
    </div>
    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <div className="mx-auto w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-5xl shadow-2xl shadow-blue-600/30">E</div>
      <h2 className="mt-8 text-center text-4xl font-black text-gray-900 dark:text-white tracking-tight">ERP Pro Web</h2>
      <p className="mt-2 text-center text-gray-500 dark:text-gray-400 font-medium">Gestiona tu empresa desde cualquier lugar</p>
    </div>

    <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white dark:bg-gray-800 py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-gray-100 dark:border-gray-700">
        {error && <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold flex gap-2 items-center border border-red-100 dark:border-red-800"><AlertCircle size={18}/>{error}</div>}

        <div className="space-y-6">
          <button onClick={onGoogle} disabled={loading} className="w-full flex justify-center items-center gap-4 py-4 px-4 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-all active:scale-95 shadow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Ingresar con Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="px-3 bg-white dark:bg-gray-800 text-gray-400 font-bold">O accede rápido</span></div>
          </div>

          <button onClick={onGuest} disabled={loading} className="w-full py-4 px-4 rounded-2xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
            <LogIn size={20} /> Entrar como Invitado
          </button>
        </div>
      </div>
    </div>
  </div>
);

// 1. DASHBOARD
const DashboardView = ({ employees, currency }) => {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.estado === 'Activo').length;
  const totalPayroll = employees.reduce((acc, curr) => acc + Number(curr.sueldoBase || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Panel de Resumen</h2>
        <p className="text-gray-500 font-medium">Estado actual de la gestión de planilla</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Trabajadores" value={totalEmployees} icon={Users} color="bg-blue-600" />
        <StatCard title="Personal Activo" value={activeEmployees} icon={UserCheck} color="bg-emerald-500" />
        <StatCard title="Nómina Mensual" value={`${currency} ${totalPayroll.toLocaleString()}`} icon={TrendingUp} color="bg-indigo-600" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
         <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Sincronización</h3>
         <div className="flex items-center gap-4 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
            <CheckCircle size={24}/>
            <p className="font-bold text-sm">Tu base de datos ERP está conectada y sincronizada en tiempo real con Firestore.</p>
         </div>
      </div>
    </div>
  );
};

// 2. LISTA TRABAJADORES
const EmployeesView = ({ employees, onEdit, onAdd, onDelete, currency }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = useMemo(() => employees.filter(e => formatFullName(e).toLowerCase().includes(searchTerm.toLowerCase()) || e.dni?.includes(searchTerm)), [employees, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Trabajadores</h2>
        <button onClick={onAdd} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"><Plus size={20}/>Nuevo</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b dark:border-gray-700">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
              <input type="text" placeholder="Buscar por nombre o DNI..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-5">DNI / Datos</th><th className="p-5">Cargo</th><th className="p-5">Sueldo Base</th><th className="p-5">Estado</th><th className="p-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="p-5">
                    <p className="font-black text-gray-900 dark:text-white">{formatFullName(emp)}</p>
                    <p className="text-xs text-gray-400 font-bold">{emp.dni}</p>
                  </td>
                  <td className="p-5 font-bold text-gray-600 dark:text-gray-400">{emp.cargo}</td>
                  <td className="p-5 font-black text-blue-600 dark:text-blue-400">{currency} {emp.sueldoBase}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${emp.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>{emp.estado}</span>
                  </td>
                  <td className="p-5 text-right flex justify-end gap-2">
                    <button onClick={() => onEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={20}/></button>
                    <button onClick={() => onDelete(emp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-20 text-center text-gray-400 font-bold">No se encontraron registros.</div>}
        </div>
      </div>
    </div>
  );
};

// 3. VISTA PRÉSTAMOS (RESTAURADA)
const LoansView = ({ employees, loans, onSaveLoan, onDeleteLoan, onProcessLoan, currency }) => {
  const [activeTab, setActiveTab] = useState('solicitud'); 
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);

  const displayedData = useMemo(() => (loans || []).filter(l => l.tipo === activeTab), [loans, activeTab]);
  const getEmployeeName = (id) => formatFullName(employees.find(e => String(e.id) === String(id)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Préstamos</h2>
        <button onClick={() => setShowNewModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"><Plus size={20}/>Nueva Solicitud</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-2">
          <button onClick={() => {setActiveTab('solicitud'); setSelectedLoanDetails(null);}} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'solicitud' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Solicitudes</button>
          <button onClick={() => {setActiveTab('prestamo'); setSelectedLoanDetails(null);}} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'prestamo' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Aprobados</button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-gray-700">
              <tr><th className="p-5">Trabajador</th><th className="p-5">Monto</th><th className="p-5 text-center">Estado</th><th className="p-5 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {displayedData.map(loan => (
                <tr key={loan.id} onClick={() => activeTab === 'prestamo' && setSelectedLoanDetails(loan)} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${activeTab === 'prestamo' ? 'cursor-pointer' : ''}`}>
                  <td className="p-5 font-bold dark:text-white">{getEmployeeName(loan.employeeId)}</td>
                  <td className="p-5 font-black text-blue-600 dark:text-blue-400">{currency} {loan.monto?.toFixed(2)}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${loan.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'}`}>{loan.estado}</span>
                  </td>
                  <td className="p-5 text-right flex justify-end gap-2">
                    {activeTab === 'solicitud' && <button onClick={() => onProcessLoan(loan.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl"><CheckCircle size={20}/></button>}
                    <button onClick={() => onDeleteLoan(loan.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={20}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayedData.length === 0 && <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Sin registros</div>}
        </div>

        {activeTab === 'prestamo' && selectedLoanDetails && (
          <div className="border-t-8 border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 p-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-black text-blue-700 dark:text-blue-400 flex items-center gap-2"><FileSpreadsheet size={24} /> Plan de Cuotas: {selectedLoanDetails.codigoPrestamo || 'Nro Gen.'}</h4>
              <X size={20} className="cursor-pointer text-gray-400" onClick={() => setSelectedLoanDetails(null)}/>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-800 font-black uppercase text-gray-500 tracking-tighter">
                  <tr><th className="p-3 text-center">#</th><th className="p-3">Interés</th><th className="p-3">Capital</th><th className="p-3 font-black text-blue-600">Total Cuota</th><th className="p-3 text-center">Pagado</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {selectedLoanDetails.detalleCuotas?.map((c, idx) => (
                    <tr key={idx} className="dark:text-gray-300">
                      <td className="p-3 text-center font-bold">{c.numero}</td>
                      <td className="p-3">{currency} {c.interes.toFixed(2)}</td>
                      <td className="p-3">{currency} {c.capital.toFixed(2)}</td>
                      <td className="p-3 font-black text-gray-900 dark:text-white">{currency} {c.montoCuota.toFixed(2)}</td>
                      <td className="p-3 text-center"><input type="checkbox" checked={c.pagado} readOnly className="rounded-lg text-blue-600 w-5 h-5 border-gray-300 dark:bg-gray-800 dark:border-gray-600" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {showNewModal && <NewLoanModal employees={employees} currency={currency} onClose={() => setShowNewModal(false)} onSave={onSaveLoan} />}
    </div>
  );
};

// 4. VISTA VACACIONES (RESTAURADA)
const VacationsView = ({ employees, vacationPeriods, vacationRequests, onSavePeriod, onDeletePeriod, onSaveRequest, onDeleteRequest, onProcessRequest }) => {
  const [activeTab, setActiveTab] = useState('periodos');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const getEmployeeName = (id) => formatFullName(employees.find(e => String(e.id) === String(id)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Vacaciones</h2>
        <button onClick={() => activeTab === 'periodos' ? setShowPeriodModal(true) : setShowRequestModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"><Plus size={20}/><span>{activeTab === 'periodos' ? 'Nuevo Periodo' : 'Nueva Solicitud'}</span></button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex gap-2">
           <button onClick={() => setActiveTab('periodos')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'periodos' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Saldos Pendientes</button>
           <button onClick={() => setActiveTab('solicitudes')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'solicitudes' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Solicitudes / Historial</button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-gray-700">
              <tr><th className="p-5">Trabajador</th><th className="p-5">{activeTab === 'periodos' ? 'Periodo' : 'Fechas'}</th><th className="p-5 text-center">Días</th><th className="p-5 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {activeTab === 'periodos' ? (
                (vacationPeriods || []).map(p => (
                  <tr key={p.id} onClick={() => setSelectedPeriod(p)} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer">
                    <td className="p-5 font-bold dark:text-white">{getEmployeeName(p.employeeId)}</td>
                    <td className="p-5 text-gray-500 dark:text-gray-400 font-medium">{p.periodo}</td>
                    <td className="p-5 text-center font-black text-indigo-600 dark:text-indigo-400">{p.saldo}</td>
                    <td className="p-5 text-right"><button onClick={(e) => { e.stopPropagation(); onDeletePeriod(p.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button></td>
                  </tr>
                ))
              ) : (
                (vacationRequests || []).map(r => (
                  <tr key={r.id}>
                    <td className="p-5 font-bold dark:text-white">{getEmployeeName(r.employeeId)}</td>
                    <td className="p-5 text-gray-500 dark:text-gray-400 font-medium">{r.fechaSalida} al {r.fechaRetorno}</td>
                    <td className="p-5 text-center font-black dark:text-gray-200">{r.totalDias}</td>
                    <td className="p-5 text-right flex justify-end gap-2">
                      {r.estado === 'Pendiente' && <button onClick={() => onProcessRequest(r)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><CheckCircle size={20}/></button>}
                      <button onClick={() => onDeleteRequest(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {((activeTab === 'periodos' && vacationPeriods.length === 0) || (activeTab === 'solicitudes' && vacationRequests.length === 0)) && <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Sin información para mostrar</div>}
        </div>

        {activeTab === 'periodos' && selectedPeriod && (
          <div className="border-t-8 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 p-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-black text-indigo-700 dark:text-indigo-400">Detalle del Periodo: {selectedPeriod.periodo}</h4>
              <X size={20} className="cursor-pointer text-gray-400" onClick={() => setSelectedPeriod(null)}/>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border dark:border-gray-700">
               <p className="text-sm font-bold text-gray-500 mb-2">Resumen de Uso:</p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                    <p className="text-[10px] uppercase font-black text-gray-400">Otorgados</p>
                    <p className="text-xl font-black dark:text-white">{selectedPeriod.diasOtorgados}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                    <p className="text-[10px] uppercase font-black text-indigo-400">Saldo Actual</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-300">{selectedPeriod.saldo}</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
      {showPeriodModal && <NewPeriodModal employees={employees} onClose={() => setShowPeriodModal(false)} onSave={onSavePeriod} />}
      {showRequestModal && <TakeVacationModal employees={employees} vacationPeriods={vacationPeriods} onClose={() => setShowRequestModal(false)} onSave={onSaveRequest} />}
    </div>
  );
};

// ==========================================
// MODALES DE APOYO (RESTAURADOS)
// ==========================================

const NewLoanModal = ({ employees, currency, onClose, onSave }) => {
  const [formData, setFormData] = useState({ employeeId: employees[0]?.id || '', monto: 1200, nroCuotas: 12, tasaInteres: 3.5 });
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onSave({ ...formData, id: Date.now().toString(), tipo: 'solicitud', estado: 'Pendiente', fechaCreacion: new Date().toISOString().split('T')[0], codigoSolicitud: `SOL-${Math.floor(Math.random()*9000)+1000}` }); 
  };
  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border dark:border-gray-700">
        <h3 className="text-2xl font-black mb-6 dark:text-white tracking-tight">Nueva Solicitud</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Colaborador</label><select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold dark:text-white">{employees.map(e => <option key={e.id} value={e.id}>{formatFullName(e)}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Monto ({currency})</label><input type="number" step="any" value={formData.monto} onChange={e => setFormData({...formData, monto: Number(e.target.value)})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-black dark:text-white" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Cuotas</label><input type="number" value={formData.nroCuotas} onChange={e => setFormData({...formData, nroCuotas: Number(e.target.value)})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-black dark:text-white" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700">Cancelar</button>
            <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Enviar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const NewPeriodModal = ({ employees, onClose, onSave }) => {
  const [formData, setFormData] = useState({ employeeId: employees[0]?.id || '', fechaInicio: new Date().toISOString().split('T')[0] });
  const handleSubmit = (e) => { e.preventDefault(); const fin = addOneYear(formData.fechaInicio); onSave({ id: Date.now().toString(), employeeId: formData.employeeId, periodo: `${formData.fechaInicio.split('-').reverse().join('/')} - ${fin.split('-').reverse().join('/')}`, saldo: 30, diasOtorgados: 30 }); onClose(); };
  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl border dark:border-gray-700">
        <h3 className="text-2xl font-black mb-6 dark:text-white tracking-tight">Habilitar Vacaciones</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 text-center block">Seleccionar Colaborador</label><select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold text-center dark:text-white">{employees.map(e => <option key={e.id} value={e.id}>{formatFullName(e)}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 text-center block">Inicio del Periodo</label><input type="date" value={formData.fechaInicio} onChange={e => setFormData({...formData, fechaInicio: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-black text-center dark:text-white" /></div>
          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-3 text-gray-400 font-bold">Cerrar</button>
            <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Generar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TakeVacationModal = ({ employees, vacationPeriods, onClose, onSave }) => {
  const [formData, setFormData] = useState({ employeeId: employees[0]?.id || '', fechaSalida: new Date().toISOString().split('T')[0], fechaRetorno: '', totalDias: 0 });
  const periods = (vacationPeriods || []).filter(p => String(p.employeeId) === String(formData.employeeId));
  useEffect(() => { if (formData.fechaSalida && formData.fechaRetorno) setFormData(prev => ({ ...prev, totalDias: calculateDaysDiff(formData.fechaSalida, formData.fechaRetorno) })); }, [formData.fechaSalida, formData.fechaRetorno]);
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (periods[0]) onSave({ ...formData, id: Date.now().toString(), periodId: periods[0].id, estado: 'Pendiente' }); 
    onClose(); 
  };

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl border dark:border-gray-700">
        <h3 className="text-2xl font-black mb-6 dark:text-white tracking-tight text-center">Solicitar Días</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold dark:text-white">{employees.map(e => <option key={e.id} value={e.id}>{formatFullName(e)}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={formData.fechaSalida} onChange={e => setFormData({...formData, fechaSalida: e.target.value})} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none text-xs dark:text-white" />
            <input type="date" value={formData.fechaRetorno} onChange={e => setFormData({...formData, fechaRetorno: e.target.value})} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none text-xs dark:text-white" />
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-center font-black text-indigo-600 dark:text-indigo-400 text-lg">Días Solicitados: {formData.totalDias}</div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-gray-400">Cancelar</button>
            <button type="submit" disabled={!periods[0] || formData.totalDias < 1} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl disabled:opacity-50 active:scale-95 transition-all">Enviar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// FORMULARIO TRABAJADOR
const EmployeeFormView = ({ employee, onSave, onCancel, currency }) => {
  const isEdit = !!employee;
  const [formData, setFormData] = useState(employee || { 
    dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', nacionalidad: 'Peruana', correo: '',
    cargo: '', sueldoBase: 1025, fechaIngreso: new Date().toISOString().split('T')[0], estado: 'Activo' 
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    setIsSaving(true);
    setSaveError('');
    try { await onSave(formData); } catch (err) { setSaveError("Error al guardar. Verifica tu Firestore."); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-2xl border dark:border-gray-700 animate-in zoom-in-95 duration-300">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">{isEdit ? 'Editar Expediente' : 'Nuevo Colaborador'}</h2>
      {saveError && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 font-bold border border-red-200"><AlertCircle size={20}/>{saveError}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nro DNI</label><input required name="dni" value={formData.dni} onChange={handleChange} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold dark:text-white focus:ring-2 focus:ring-blue-500" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nombres</label><input required name="nombres" value={formData.nombres} onChange={handleChange} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold dark:text-white focus:ring-2 focus:ring-blue-500" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Apellido Paterno</label><input required name="apellidoPaterno" value={formData.apellidoPaterno} onChange={handleChange} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold dark:text-white focus:ring-2 focus:ring-blue-500" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Apellido Materno</label><input required name="apellidoMaterno" value={formData.apellidoMaterno} onChange={handleChange} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold dark:text-white focus:ring-2 focus:ring-blue-500" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Cargo / Puesto</label><input required name="cargo" value={formData.cargo} onChange={handleChange} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-bold dark:text-white focus:ring-2 focus:ring-blue-500" /></div>
        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Sueldo ({currency})</label><input required type="number" step="any" name="sueldoBase" value={formData.sueldoBase} onChange={handleChange} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none font-black text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500" /></div>
        <div className="col-span-full flex justify-end gap-4 mt-8 pt-8 border-t dark:border-gray-700">
          <button type="button" onClick={onCancel} className="px-8 py-3 text-gray-500 font-black">Cancelar</button>
          <button type="submit" disabled={isSaving} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
            {isSaving ? 'Enviando...' : 'Confirmar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
};

// CONFIGURACIÓN
const ConfigurationView = ({ darkMode, setDarkMode, currency, setCurrency }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white">Ajustes</h2>
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-sm border dark:border-gray-700 space-y-10">
        <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-xl"><Moon size={24}/></div>
            <div>
              <p className="font-black text-gray-900 dark:text-white">Modo Oscuro</p>
              <p className="text-sm text-gray-500 font-medium">Cambia la apariencia del sistema para entornos de poca luz.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>
            <div className="w-16 h-8 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-xl"><DollarSign size={24}/></div>
            <div><p className="font-black text-gray-900 dark:text-white">Moneda</p><p className="text-sm text-gray-500 font-medium">Símbolo base para la nómina y préstamos.</p></div>
          </div>
          <div className="flex gap-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-2xl">
            {['S/.', '$'].map(c => (<button key={c} onClick={() => setCurrency(c)} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${currency === c ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-lg' : 'text-gray-500'}`}>{c}</button>))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [syncError, setSyncError] = useState('');

  const [darkMode, setDarkMode] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('theme') === 'dark' : false));
  const [currency, setCurrency] = useState(() => (typeof window !== 'undefined' ? (localStorage.getItem('currency') || 'S/.') : 'S/.'));
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
  
  const [employees, setEmployees] = useState([]);
  const [loans, setLoans] = useState([]); 
  const [vacationPeriods, setVacationPeriods] = useState([]);
  const [vacationRequests, setVacationRequests] = useState([]);

  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isPlanillaMenuOpen, setIsPlanillaMenuOpen] = useState(true);

  // EFECTO MODO OSCURO GLOBAL (PERSISTENTE)
  useEffect(() => { 
    localStorage.setItem('theme', darkMode ? 'dark' : 'light'); 
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);

  // AUTH
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {}
      } else {
        try { await signInAnonymously(auth); } catch(e) {}
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setActionLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  // DATA
  useEffect(() => {
    if (!user || !db) return;
    const handleDbError = (err) => setSyncError("Error de permisos en Firestore.");
    const unsubEmp = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'employees'), (snap) => { setEmployees(snap.docs.map(d => d.data())); setSyncError(''); }, handleDbError);
    const unsubLoans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), (snap) => setLoans(snap.docs.map(d => d.data())), handleDbError);
    const unsubVacP = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods'), (snap) => setVacationPeriods(snap.docs.map(d => d.data())), handleDbError);
    const unsubVacR = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests'), (snap) => setVacationRequests(snap.docs.map(d => d.data())), handleDbError);
    return () => { unsubEmp(); unsubLoans(); unsubVacP(); unsubVacR(); };
  }, [user]);

  const loginWithGoogle = async () => { setActionLoading(true); setLoginError(''); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { setLoginError('Acceso Google fallido.'); setActionLoading(false); } };
  const navigateTo = (view) => { setCurrentView(view); setSidebarOpen(false); };

  // CRUD HANDLERS
  const handleSaveEmployee = async (data) => {
    if (!user || !db) throw new Error("DB Offline");
    const id = editingEmployee ? editingEmployee.id.toString() : Date.now().toString();
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', id), { ...data, id });
    if (!editingEmployee && data.fechaIngreso) {
      const fin = addOneYear(data.fechaIngreso);
      const pid = (Date.now() + 1).toString();
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', pid), { id: pid, employeeId: id, periodo: `${data.fechaIngreso.split('-').reverse().join('/')} - ${fin.split('-').reverse().join('/')}`, saldo: 30, diasOtorgados: 30 });
    }
    navigateTo('employees');
  };

  const handleDeleteEmployee = async (id) => {
    if (!user || !db) return;
    const empId = id.toString();
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', empId));
    // Borrado en cascada
    loans.filter(l => String(l.employeeId) === empId).forEach(l => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', l.id.toString())));
    vacationPeriods.filter(p => String(p.employeeId) === empId).forEach(p => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', p.id.toString())));
    vacationRequests.filter(r => String(r.employeeId) === empId).forEach(r => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', r.id.toString())));
  };

  const handleSaveLoan = (l) => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', l.id.toString()), l);
  const handleProcessLoan = (id) => { const loan = loans.find(l => String(l.id) === String(id)); if (loan) { const plan = generarAmortizacion(loan.monto, (loan.monto * (loan.tasaInteres/100)) * (loan.nroCuotas/12), loan.nroCuotas); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', id.toString()), { ...loan, tipo: 'prestamo', estado: 'Aprobado', codigoPrestamo: `PRST-${id.slice(-4)}`, detalleCuotas: plan }); } };
  const handleSaveVacationPeriod = (p) => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', p.id.toString()), p);
  const handleProcessVacationRequest = (r) => { const period = vacationPeriods.find(p => String(p.id) === String(r.periodId)); if (period) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', period.id.toString()), { ...period, saldo: period.saldo - r.totalDias }); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', r.id.toString()), { ...r, estado: 'Aprobado' }); };

  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div></div>;
  if (!user) return <LoginView onGoogle={loginWithGoogle} onGuest={() => signInAnonymously(auth)} loading={actionLoading} error={loginError} darkMode={darkMode} setDarkMode={setDarkMode} />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView employees={employees} currency={currency} />;
      case 'employees': return <EmployeesView employees={employees} onAdd={() => { setEditingEmployee(null); navigateTo('employee_form'); }} onEdit={(e) => { setEditingEmployee(e); navigateTo('employee_form'); }} onDelete={handleDeleteEmployee} currency={currency} />;
      case 'employee_form': return <EmployeeFormView employee={editingEmployee} currency={currency} onSave={handleSaveEmployee} onCancel={() => navigateTo('employees')} />;
      case 'consultas_prestamos': return <LoansView employees={employees} loans={loans} onSaveLoan={handleSaveLoan} onDeleteLoan={(id) => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', id.toString()))} onProcessLoan={handleProcessLoan} currency={currency} />;
      case 'consultas_vacaciones': return <VacationsView employees={employees} vacationPeriods={vacationPeriods} vacationRequests={vacationRequests} onSavePeriod={handleSaveVacationPeriod} onDeletePeriod={(id) => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', id.toString()))} onSaveRequest={(r) => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', r.id.toString()), r)} onDeleteRequest={(id) => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', id.toString()))} onProcessRequest={handleProcessVacationRequest} />;
      case 'configuracion': return <ConfigurationView darkMode={darkMode} setDarkMode={setDarkMode} currency={currency} setCurrency={setCurrency} />;
      default: return <DashboardView employees={employees} currency={currency} />;
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans">
        {/* SIDEBAR DETALLADO */}
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-gray-300 transform transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-950 font-black text-2xl text-white tracking-tighter">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-blue-600/30">E</div> ERP Pro
          </div>
          <nav className="p-6 space-y-3">
            <button onClick={() => navigateTo('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={22}/>Dashboard</button>
            
            <div className="pt-4">
              <button onClick={() => setIsPlanillaMenuOpen(!isPlanillaMenuOpen)} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800 transition-all">
                <div className="flex items-center gap-4 font-black"><Briefcase size={22}/>Planilla</div>
                {isPlanillaMenuOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
              </button>
              {isPlanillaMenuOpen && (
                <div className="ml-10 border-l-2 border-slate-700 pl-4 mt-2 space-y-2">
                  <button onClick={() => navigateTo('employees')} className={`w-full text-left p-3 text-sm font-bold rounded-xl transition-all ${currentView === 'employees' ? 'text-blue-400 bg-blue-400/5' : 'text-gray-400 hover:text-white'}`}>• Trabajadores</button>
                  <button onClick={() => navigateTo('consultas_prestamos')} className={`w-full text-left p-3 text-sm font-bold rounded-xl transition-all ${currentView === 'consultas_prestamos' ? 'text-blue-400 bg-blue-400/5' : 'text-gray-400 hover:text-white'}`}>• Préstamos</button>
                  <button onClick={() => navigateTo('consultas_vacaciones')} className={`w-full text-left p-3 text-sm font-bold rounded-xl transition-all ${currentView === 'consultas_vacaciones' ? 'text-blue-400 bg-blue-400/5' : 'text-gray-400 hover:text-white'}`}>• Vacaciones</button>
                </div>
              )}
            </div>

            <div className="pt-10 border-t border-slate-800">
               <button onClick={() => navigateTo('configuracion')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all ${currentView === 'configuracion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Settings size={22}/>Configuración</button>
            </div>
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {syncError && <div className="bg-red-600 text-white p-3 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"><AlertCircle size={16}/>{syncError}</div>}
          <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 transition-colors z-10">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500"><Menu size={28}/></button>
            <div className="flex items-center gap-6 ml-auto">
               <button onClick={() => setDarkMode(!darkMode)} className="p-3 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-2xl transition-all">{darkMode ? <Sun size={24}/> : <Moon size={24}/>}</button>
               <div className="flex items-center gap-4 border-l dark:border-gray-800 pl-6">
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-black dark:text-white leading-none mb-1">{user.displayName || 'Administrador'}</p>
                   <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">Online</span>
                 </div>
                 <button onClick={() => signOut(auth)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-3 rounded-2xl transition-all active:scale-90"><LogOut size={24}/></button>
               </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-8 sm:p-12">
            <div className="max-w-7xl mx-auto">
              {renderView()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}