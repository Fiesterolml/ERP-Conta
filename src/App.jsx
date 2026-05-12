import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, X, Sun, Moon, LayoutDashboard, Users, 
  Settings, ChevronDown, ChevronUp, 
  Search, Plus, Edit2, Trash2, Briefcase, 
  DollarSign, UserCheck, Bell, CheckCircle,
  FileSpreadsheet, Eye, AlertCircle,
  PlaneTakeoff, CalendarDays, LogOut, LogIn
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
  
  // SOLUCIÓN CRÍTICA: Limpiar barras del appId para evitar error de segmentos en Firestore
  const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'erp-prototype';
  appId = rawAppId.replace(/\//g, '_');
} catch (e) {
  console.error("Error inicializando Firebase:", e);
}

// ==========================================
// UTILIDADES (CÁLCULOS)
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
// COMPONENTES REUTILIZABLES
// ==========================================
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition-colors">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

// ==========================================
// VISTAS
// ==========================================

const LoginView = ({ onGoogle, onGuest, loading, error, darkMode, setDarkMode }) => (
  <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
    <div className="absolute top-4 right-4">
       <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
         {darkMode ? <Sun size={20} /> : <Moon size={20} />}
       </button>
    </div>
    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-lg">E</div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">ERP Pro Web</h2>
      <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">Inicia sesión para sincronizar tus datos</p>
    </div>

    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100 dark:border-gray-700">
        {error && <div className="mb-5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center font-medium border border-red-100 dark:border-red-800">{error}</div>}

        <div className="space-y-4">
          <button onClick={onGoogle} disabled={loading} className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Ingresar con Google
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500">O ingresa temporalmente</span></div>
          </div>

          <button onClick={onGuest} disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all">
            <LogIn size={18} />
            Entrar como Invitado
          </button>
        </div>
      </div>
    </div>
  </div>
);

const DashboardView = ({ employees, currency }) => {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.estado === 'Activo').length;
  const totalPayroll = employees.reduce((acc, curr) => acc + Number(curr.sueldoBase || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Control</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Empleados" value={totalEmployees} icon={Users} color="bg-blue-500" />
        <StatCard title="Empleados Activos" value={activeEmployees} icon={UserCheck} color="bg-green-500" />
        <StatCard title="Nómina Mensual (Est.)" value={`${currency} ${totalPayroll.toLocaleString()}`} icon={DollarSign} color="bg-indigo-500" />
      </div>
    </div>
  );
};

const EmployeesView = ({ employees, onEdit, onAdd, onDelete, currency }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => {
      if (!emp) return false;
      const fullName = formatFullName(emp).toLowerCase();
      const search = (searchTerm || '').toLowerCase();
      return fullName.includes(search) || 
             (emp.dni && String(emp.dni).includes(search)) ||
             (emp.correo && String(emp.correo).toLowerCase().includes(search));
    });
  }, [employees, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Mantenimiento de Trabajadores</h2>
        <button onClick={onAdd} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          <Plus size={18} /><span>Nuevo Trabajador</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombres, apellidos, DNI o correo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[250px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700 font-bold">
                <th className="p-4">DNI</th><th className="p-4">Nombre Completo</th><th className="p-4">Cargo</th><th className="p-4">Sueldo Base</th><th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 text-gray-800 dark:text-gray-200">{emp.dni}</td>
                  <td className="p-4"><p className="font-medium text-gray-900 dark:text-white">{formatFullName(emp)}</p></td>
                  <td className="p-4 text-gray-600 dark:text-gray-300 text-sm">{emp.cargo}</td>
                  <td className="p-4 font-medium text-blue-600 dark:text-blue-400">{currency} {emp.sueldoBase}</td>
                  <td className="p-4 flex justify-end gap-2">
                    <button onClick={() => onEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 rounded-lg transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => onDelete(emp.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">No hay registros almacenados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LoansView = ({ employees, loans, onSaveLoan, onDeleteLoan, onProcessLoan, currency }) => {
  const [activeTab, setActiveTab] = useState('solicitud'); 
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);

  const displayedData = useMemo(() => (loans || []).filter(l => l.tipo === activeTab), [loans, activeTab]);
  const getEmployeeName = (id) => formatFullName(employees.find(e => String(e.id) === String(id)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Préstamos y Solicitudes</h2>
        <button onClick={() => setShowNewModal(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg"><Plus size={18} /><span>Nueva Solicitud</span></button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-2">
          <button onClick={() => setActiveTab('solicitud')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${activeTab === 'solicitud' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>Solicitudes</button>
          <button onClick={() => setActiveTab('prestamo')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${activeTab === 'prestamo' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>Préstamos</button>
        </div>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 font-bold">
                <th className="p-3">Trabajador</th><th className="p-3">Monto</th><th className="p-3 text-center">Estado</th><th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayedData.map((item) => (
                <tr key={item.id} onClick={() => activeTab === 'prestamo' && setSelectedLoanDetails(item)} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${activeTab === 'prestamo' ? 'cursor-pointer' : ''}`}>
                  <td className="p-3 font-medium text-gray-900 dark:text-white">{getEmployeeName(item.employeeId)}</td>
                  <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{currency} {item.monto?.toFixed(2)}</td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.estado === 'Aprobado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30'}`}>{item.estado}</span></td>
                  <td className="p-3 text-center flex justify-end gap-2">
                    {activeTab === 'solicitud' && <button onClick={(e) => { e.stopPropagation(); onProcessLoan(item.id); }} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle size={18}/></button>}
                    <button onClick={(e) => { e.stopPropagation(); onDeleteLoan(item.id); if (selectedLoanDetails?.id === item.id) setSelectedLoanDetails(null); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {activeTab === 'prestamo' && selectedLoanDetails && (
          <div className="border-t-4 border-blue-500 bg-gray-50 dark:bg-gray-800/80 p-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><FileSpreadsheet size={16} /> Plan de Amortización</h4>
            <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded border dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead><tr className="bg-gray-100 dark:bg-gray-800 font-bold border-b dark:border-gray-700"><th className="p-2">Cuota</th><th className="p-2">Interés</th><th className="p-2">Capital</th><th className="p-2">Total</th><th className="p-2">Pagado</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedLoanDetails.detalleCuotas?.map((c, idx) => (
                    <tr key={idx}><td className="p-2 text-center">{c.numero}</td><td className="p-2">{currency} {c.interes.toFixed(2)}</td><td className="p-2">{currency} {c.capital.toFixed(2)}</td><td className="p-2 font-bold">{currency} {c.montoCuota.toFixed(2)}</td><td className="p-2 text-center"><input type="checkbox" checked={c.pagado} readOnly className="rounded text-blue-600" /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {showNewModal && <NewLoanModal employees={employees} currency={currency} onClose={() => setShowNewModal(false)} onSave={(l) => { onSaveLoan(l); setShowNewModal(false); }} />}
    </div>
  );
};

const VacationsView = ({ employees, vacationPeriods, vacationRequests, onSavePeriod, onDeletePeriod, onSaveRequest, onDeleteRequest, onProcessRequest }) => {
  const [activeTab, setActiveTab] = useState('periodos');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPeriodDetails, setSelectedPeriodDetails] = useState(null);

  const getEmployeeName = (id) => formatFullName(employees.find(e => String(e.id) === String(id)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Vacaciones</h2>
        <button onClick={() => activeTab === 'periodos' ? setShowPeriodModal(true) : setShowRequestModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18}/><span>{activeTab === 'periodos' ? 'Nuevo Periodo' : 'Solicitar'}</span></button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-2">
           <button onClick={() => setActiveTab('periodos')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${activeTab === 'periodos' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600'}`}>Periodos</button>
           <button onClick={() => setActiveTab('solicitudes')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${activeTab === 'solicitudes' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600'}`}>Solicitudes</button>
        </div>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 font-bold">
                <th className="p-3">Trabajador</th><th className="p-3">{activeTab === 'periodos' ? 'Periodo' : 'Rango'}</th><th className="p-3 text-center">Días</th><th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {activeTab === 'periodos' ? (
                (vacationPeriods || []).map(p => (
                  <tr key={p.id} onClick={() => setSelectedPeriodDetails(p)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{getEmployeeName(p.employeeId)}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.periodo}</td>
                    <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{p.saldo}</td>
                    <td className="p-3 text-right"><button onClick={(e) => { e.stopPropagation(); onDeletePeriod(p.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button></td>
                  </tr>
                ))
              ) : (
                (vacationRequests || []).map(r => (
                  <tr key={r.id}>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{getEmployeeName(r.employeeId)}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{r.fechaSalida} al {r.fechaRetorno}</td>
                    <td className="p-3 text-center font-bold dark:text-gray-300">{r.totalDias}</td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      {r.estado === 'Pendiente' && <button onClick={() => onProcessRequest(r)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle size={18}/></button>}
                      <button onClick={() => onDeleteRequest(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showPeriodModal && <NewPeriodModal employees={employees} onClose={() => setShowPeriodModal(false)} onSave={onSavePeriod} />}
      {showRequestModal && <TakeVacationModal employees={employees} vacationPeriods={vacationPeriods} onClose={() => setShowRequestModal(false)} onSave={onSaveRequest} />}
    </div>
  );
};

// MODALES COMPLEMENTARIOS
const NewLoanModal = ({ employees, currency, onClose, onSave }) => {
  const [formData, setFormData] = useState({ employeeId: employees[0]?.id || '', monto: 1000, nroCuotas: 12, tasaInteres: 3.5 });
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...formData, id: Date.now().toString(), tipo: 'solicitud', estado: 'Pendiente', fechaCreacion: new Date().toISOString().split('T')[0] }); };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold mb-4 dark:text-white">Nueva Solicitud de Préstamo</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600">{employees.map(e => <option key={e.id} value={e.id}>{formatFullName(e)}</option>)}</select>
          <div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Monto" value={formData.monto} onChange={e => setFormData({...formData, monto: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /><input type="number" placeholder="Cuotas" value={formData.nroCuotas} onChange={e => setFormData({...formData, nroCuotas: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 font-medium">Cancelar</button><button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium shadow-md">Enviar</button></div>
        </form>
      </div>
    </div>
  );
};

const NewPeriodModal = ({ employees, onClose, onSave }) => {
  const [formData, setFormData] = useState({ employeeId: employees[0]?.id || '', fechaInicio: new Date().toISOString().split('T')[0] });
  const handleSubmit = (e) => { e.preventDefault(); const fin = addOneYear(formData.fechaInicio); onSave({ id: Date.now().toString(), employeeId: formData.employeeId, periodo: `${formData.fechaInicio} - ${fin}`, saldo: 30, diasOtorgados: 30, remIntegra: false }); onClose(); };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-bold mb-4 dark:text-white">Nuevo Periodo Vacacional</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600">{employees.map(e => <option key={e.id} value={e.id}>{formatFullName(e)}</option>)}</select>
          <input type="date" value={formData.fechaInicio} onChange={e => setFormData({...formData, fechaInicio: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" />
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-500">Cancelar</button><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow-md">Generar</button></div>
        </form>
      </div>
    </div>
  );
};

const TakeVacationModal = ({ employees, vacationPeriods, onClose, onSave }) => {
  const [formData, setFormData] = useState({ employeeId: employees[0]?.id || '', fechaSalida: new Date().toISOString().split('T')[0], fechaRetorno: '', totalDias: 0 });
  const periods = (vacationPeriods || []).filter(p => String(p.employeeId) === String(formData.employeeId));
  useEffect(() => { if (formData.fechaSalida && formData.fechaRetorno) setFormData(prev => ({ ...prev, totalDias: calculateDaysDiff(formData.fechaSalida, formData.fechaRetorno) })); }, [formData.fechaSalida, formData.fechaRetorno]);
  const handleSubmit = (e) => { e.preventDefault(); if (periods[0]) onSave({ ...formData, id: Date.now().toString(), periodId: periods[0].id, estado: 'Pendiente' }); onClose(); };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-bold mb-4 dark:text-white">Solicitar Vacaciones</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600">{employees.map(e => <option key={e.id} value={e.id}>{formatFullName(e)}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><input type="date" value={formData.fechaSalida} onChange={e => setFormData({...formData, fechaSalida: e.target.value})} className="p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /><input type="date" value={formData.fechaRetorno} onChange={e => setFormData({...formData, fechaRetorno: e.target.value})} className="p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded text-center font-bold text-indigo-600 dark:text-indigo-400">Días: {formData.totalDias}</div>
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2">Cancelar</button><button type="submit" disabled={!periods[0]} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow-md disabled:opacity-50">Solicitar</button></div>
        </form>
      </div>
    </div>
  );
};

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
    try {
      await onSave(formData);
    } catch (err) {
      setSaveError("No se pudo guardar. Verifica tu base de datos Firestore.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl p-8 shadow-xl border dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{isEdit ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
      {saveError && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200"><AlertCircle size={20}/>{saveError}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">DNI</label><input required name="dni" value={formData.dni} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Nombres</label><input required name="nombres" value={formData.nombres} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Apellido Paterno</label><input required name="apellidoPaterno" value={formData.apellidoPaterno} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Apellido Materno</label><input required name="apellidoMaterno" value={formData.apellidoMaterno} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Cargo</label><input required name="cargo" value={formData.cargo} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Sueldo Base ({currency})</label><input required type="number" step="any" name="sueldoBase" value={formData.sueldoBase} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Fecha Ingreso</label><input required type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="col-span-full flex justify-end gap-3 mt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium">Cancelar</button>
          <button type="submit" disabled={isSaving} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-medium shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all">
            {isSaving ? 'Guardando...' : 'Guardar Trabajador'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ConfigurationView = ({ darkMode, setDarkMode, currency, setCurrency }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración del Sistema</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-8">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700">
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Modo Oscuro</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Activa el tema oscuro globalmente.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>
            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600 transition-all"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700">
          <div><p className="font-bold text-gray-900 dark:text-white">Moneda Base</p><p className="text-sm text-gray-500 dark:text-gray-400">Símbolo de nómina.</p></div>
          <div className="flex gap-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
            {['S/.', '$'].map(c => (<button key={c} onClick={() => setCurrency(c)} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${currency === c ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}>{c}</button>))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// APLICACIÓN PRINCIPAL
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

  // PERSISTENCIA Y APLICACIÓN DE MODO OSCURO GLOBAL
  useEffect(() => { 
    localStorage.setItem('theme', darkMode ? 'dark' : 'light'); 
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (typeof window !== 'undefined' && window.__initial_auth_token) {
        try { await signInWithCustomToken(auth, window.__initial_auth_token); } catch(e) {}
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

  useEffect(() => {
    if (!user || !db) return;
    const unsubEmp = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'employees'), (snap) => setEmployees(snap.docs.map(d => d.data())), () => setSyncError("Error de permisos."));
    const unsubLoans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), (snap) => setLoans(snap.docs.map(d => d.data())), console.error);
    const unsubVacP = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods'), (snap) => setVacationPeriods(snap.docs.map(d => d.data())), console.error);
    const unsubVacR = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests'), (snap) => setVacationRequests(snap.docs.map(d => d.data())), console.error);
    return () => { unsubEmp(); unsubLoans(); unsubVacP(); unsubVacR(); };
  }, [user]);

  const loginWithGoogle = async () => { setActionLoading(true); setLoginError(''); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { setLoginError('Error de conexión.'); setActionLoading(false); } };
  const navigateTo = (view) => { setCurrentView(view); setSidebarOpen(false); };

  const handleSaveEmployee = async (data) => {
    if (!user || !db) throw new Error("DB No inicializada");
    const id = editingEmployee ? editingEmployee.id.toString() : Date.now().toString();
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', id), { ...data, id });
    if (!editingEmployee && data.fechaIngreso) {
      const fin = addOneYear(data.fechaIngreso);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', (Date.now() + 1).toString()), { id: (Date.now() + 1).toString(), employeeId: id, periodo: `${data.fechaIngreso} - ${fin}`, saldo: 30, diasOtorgados: 30, remIntegra: false });
    }
    navigateTo('employees');
  };

  const handleDeleteEmployee = async (id) => {
    if (!user || !db) return;
    const empId = id.toString();
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', empId));
    loans.filter(l => String(l.employeeId) === empId).forEach(l => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', l.id.toString())));
    vacationPeriods.filter(p => String(p.employeeId) === empId).forEach(p => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', p.id.toString())));
    vacationRequests.filter(r => String(r.employeeId) === empId).forEach(r => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', r.id.toString())));
  };

  const handleSaveLoan = (l) => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', l.id.toString()), l);
  const handleProcessLoan = (id) => { const loan = loans.find(l => String(l.id) === String(id)); if (loan) { const plan = generarAmortizacion(loan.monto, (loan.monto * (loan.tasaInteres/100)) * (loan.nroCuotas/12), loan.nroCuotas); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', id.toString()), { ...loan, tipo: 'prestamo', estado: 'Aprobado', codigoPrestamo: `PRST-${id.slice(-4)}`, detalleCuotas: plan }); } };
  const handleSaveVacationPeriod = (p) => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', p.id.toString()), p);
  const handleProcessVacationRequest = (r) => { const period = vacationPeriods.find(p => String(p.id) === String(r.periodId)); if (period) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', period.id.toString()), { ...period, saldo: period.saldo - r.totalDias }); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', r.id.toString()), { ...r, estado: 'Aprobado' }); };

  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
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
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-gray-300 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 font-bold text-xl text-white tracking-wide"><div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-2">E</div> ERP Pro</div>
          <nav className="p-4 space-y-2">
            <button onClick={() => navigateTo('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={20}/>Dashboard</button>
            <button onClick={() => setIsPlanillaMenuOpen(!isPlanillaMenuOpen)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"><div className="flex items-center gap-3"><Briefcase size={20}/>Planilla</div>{isPlanillaMenuOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
            {isPlanillaMenuOpen && (
              <div className="ml-9 border-l border-slate-700 pl-2 space-y-1">
                <button onClick={() => navigateTo('employees')} className={`w-full text-left p-2 text-sm rounded ${currentView === 'employees' ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}>• Trabajadores</button>
                <button onClick={() => navigateTo('consultas_prestamos')} className={`w-full text-left p-2 text-sm rounded ${currentView === 'consultas_prestamos' ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}>• Préstamos</button>
                <button onClick={() => navigateTo('consultas_vacaciones')} className={`w-full text-left p-2 text-sm rounded ${currentView === 'consultas_vacaciones' ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}>• Vacaciones</button>
              </div>
            )}
            <div className="pt-4 border-t border-slate-800 mt-4"><button onClick={() => navigateTo('configuracion')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${currentView === 'configuracion' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}><Settings size={20}/>Configuración</button></div>
          </nav>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {syncError && <div className="bg-red-600 text-white p-2 text-center text-xs flex items-center justify-center gap-2 transition-all"><AlertCircle size={14}/>{syncError}</div>}
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 transition-colors shadow-sm z-10">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500"><Menu size={24}/></button>
            <div className="flex items-center gap-4 ml-auto">
               <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full transition-colors">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
               <div className="flex items-center gap-3 border-l pl-4 dark:border-gray-700">
                 <div className="text-right hidden sm:block"><p className="text-sm font-bold dark:text-white leading-none">{user.displayName || 'Usuario'}</p><span className="text-[10px] text-gray-500 uppercase tracking-widest">Admin</span></div>
                 <button onClick={() => signOut(auth)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"><LogOut size={20}/></button>
               </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-50 dark:bg-gray-900/50">{renderView()}</div>
        </main>
      </div>
    </div>
  );
}