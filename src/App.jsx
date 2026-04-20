import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, X, Sun, Moon, LayoutDashboard, Users, 
  FileText, Settings, ChevronDown, ChevronUp, 
  Search, Plus, Edit2, Trash2, Briefcase, 
  DollarSign, UserCheck, Bell, CheckCircle,
  FileSpreadsheet, Calendar, AlertCircle, Eye,
  Palmtree, PlaneTakeoff, CalendarDays, LogOut, LogIn
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// FIREBASE SETUP
// ==========================================
let app, auth, db, appId;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'erp-prototype';
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

const calculateWeekends = (start, end) => {
  if (!start || !end) return 0;
  let d1 = new Date(start);
  let d2 = new Date(end);
  d1.setMinutes(d1.getMinutes() + d1.getTimezoneOffset());
  d2.setMinutes(d2.getMinutes() + d2.getTimezoneOffset());
  let count = 0;
  while (d1 <= d2) {
    let day = d1.getDay();
    if (day === 0 || day === 6) count++;
    d1.setDate(d1.getDate() + 1);
  }
  return count;
};

const formatFullName = (emp) => {
  if (!emp) return 'Desconocido';
  return `${emp.nombres} ${emp.apellidoPaterno} ${emp.apellidoMaterno}`.trim();
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

// 0. LOGIN VIEW
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

// 1. DASHBOARD
const DashboardView = ({ employees, currency }) => {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.estado === 'Activo').length;
  const totalPayroll = employees.reduce((acc, curr) => acc + Number(curr.sueldoBase), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Control</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Empleados" value={totalEmployees} icon={Users} color="bg-blue-500" />
        <StatCard title="Empleados Activos" value={activeEmployees} icon={UserCheck} color="bg-green-500" />
        <StatCard title="Nómina Mensual (Est.)" value={`${currency} ${totalPayroll.toLocaleString()}`} icon={DollarSign} color="bg-indigo-500" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Actividad Reciente</h3>
        <div className="space-y-3 text-gray-600 dark:text-gray-400 text-sm">
          <p className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Sincronización en la nube con Firestore conectada.</p>
          <p className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Módulo de planilla, préstamos y vacaciones inicializados.</p>
        </div>
      </div>
    </div>
  );
};

// 2. LISTA DE EMPLEADOS
const EmployeesView = ({ employees, onEdit, onAdd, onDelete, currency }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const fullName = formatFullName(emp).toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) || 
             emp.dni.includes(searchTerm) ||
             (emp.correo && emp.correo.toLowerCase().includes(searchTerm.toLowerCase()));
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
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold">DNI</th>
                <th className="p-4 font-semibold">Nombre Completo</th>
                <th className="p-4 font-semibold">Nacionalidad</th>
                <th className="p-4 font-semibold">Cargo</th>
                <th className="p-4 font-semibold">Fecha Ingreso</th>
                <th className="p-4 font-semibold">Sueldo Base</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 text-gray-800 dark:text-gray-200">{emp.dni}</td>
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{formatFullName(emp)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{emp.correo}</p>
                  </td>
                  <td className="p-4 text-gray-800 dark:text-gray-200">{emp.nacionalidad}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-2"><Briefcase size={16} className="text-gray-400" />{emp.cargo}</span>
                  </td>
                  <td className="p-4 text-gray-800 dark:text-gray-200">{emp.fechaIngreso?.split('-').reverse().join('/') || '-'}</td>
                  <td className="p-4 text-gray-800 dark:text-gray-200 font-medium text-blue-600 dark:text-blue-400">{currency} {emp.sueldoBase}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${emp.estado === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {emp.estado}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button onClick={() => onEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar"><Edit2 size={18} /></button>
                    <button onClick={() => onDelete(emp.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500 dark:text-gray-400">No hay registros almacenados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 3. VISTA DE PRÉSTAMOS
const LoansView = ({ employees, loans, onSaveLoan, onDeleteLoan, onProcessLoan, currency }) => {
  const [activeTab, setActiveTab] = useState('solicitud'); 
  const [isAllEmployees, setIsAllEmployees] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);

  const displayedData = useMemo(() => {
    let data = loans.filter(l => l.tipo === activeTab);
    if (!isAllEmployees && selectedEmpId) {
      data = data.filter(l => String(l.employeeId) === String(selectedEmpId));
    }
    return data;
  }, [loans, activeTab, isAllEmployees, selectedEmpId]);

  useEffect(() => { setSelectedLoanDetails(null); }, [activeTab, isAllEmployees, selectedEmpId]);

  const getEmployeeName = (id) => formatFullName(employees.find(e => String(e.id) === String(id)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Préstamos y Solicitudes</h2>
        <button onClick={() => setShowNewModal(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          <Plus size={18} /><span>{activeTab === 'solicitud' ? 'Nueva Solicitud' : 'Nuevo Préstamo'}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex bg-gray-200/50 dark:bg-gray-800 p-1 rounded-lg w-fit border border-gray-200 dark:border-gray-700">
              <button onClick={() => setActiveTab('solicitud')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'solicitud' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>Solicitudes</button>
              <button onClick={() => setActiveTab('prestamo')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'prestamo' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>Préstamos</button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={isAllEmployees} onChange={(e) => setIsAllEmployees(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                Todos los trabajadores
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Trabajador:</span>
                <select disabled={isAllEmployees} value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none disabled:opacity-50">
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{formatFullName(emp)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[250px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="p-3 font-semibold">Cód. Solicitud</th>
                {activeTab === 'prestamo' && <th className="p-3 font-semibold text-blue-600 dark:text-blue-400">Cód. Préstamo</th>}
                <th className="p-3 font-semibold">Trabajador</th>
                <th className="p-3 font-semibold">Fecha</th>
                <th className="p-3 font-semibold text-center">Cuotas</th>
                <th className="p-3 font-semibold text-right">Tasa (%)</th>
                <th className="p-3 font-semibold text-right">Monto</th>
                <th className="p-3 font-semibold text-right">Monto Total</th>
                {activeTab === 'prestamo' && <th className="p-3 font-semibold text-center">Estado</th>}
                <th className="p-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayedData.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => activeTab === 'prestamo' && setSelectedLoanDetails(item)}
                  className={`transition-colors ${activeTab === 'prestamo' ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'} ${selectedLoanDetails?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                >
                  <td className="p-3 text-gray-800 dark:text-gray-300">{item.codigoSolicitud}</td>
                  {activeTab === 'prestamo' && <td className="p-3 font-medium text-blue-600 dark:text-blue-400">{item.codigoPrestamo}</td>}
                  <td className="p-3 font-medium text-gray-900 dark:text-white">{getEmployeeName(item.employeeId)}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{item.fechaCreacion}</td>
                  <td className="p-3 text-center text-gray-800 dark:text-gray-300">{item.nroCuotas}</td>
                  <td className="p-3 text-right text-gray-800 dark:text-gray-300">{item.tasaInteres.toFixed(3)}</td>
                  <td className="p-3 text-right text-gray-800 dark:text-gray-300">{currency} {item.monto.toFixed(2)}</td>
                  <td className="p-3 text-right font-medium text-gray-900 dark:text-white">{currency} {item.montoTotal.toFixed(2)}</td>
                  {activeTab === 'prestamo' && (
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {item.estado}
                      </span>
                    </td>
                  )}
                  <td className="p-3 text-center flex justify-center gap-2">
                    {activeTab === 'solicitud' ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onProcessLoan(item.id); }} className="px-2 py-1 flex items-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors" title="Procesar Solicitud (Generar Préstamo)">
                          <CheckCircle size={14} /> Procesar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteLoan(item.id); }} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar"><Trash2 size={16}/></button>
                      </>
                    ) : (
                      <>
                        <button className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Ver Detalles"><Eye size={18}/></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteLoan(item.id); if (selectedLoanDetails?.id === item.id) setSelectedLoanDetails(null); }} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar"><Trash2 size={16}/></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {displayedData.length === 0 && (
                <tr><td colSpan="10" className="p-8 text-center text-gray-500 dark:text-gray-400">No hay registros para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {activeTab === 'prestamo' && selectedLoanDetails && (
          <div className="border-t-4 border-gray-200 dark:border-gray-900 bg-gray-50 dark:bg-gray-800/80 p-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <FileSpreadsheet size={16} /> Plan de Cuotas: <span className="text-blue-600 dark:text-blue-400">{selectedLoanDetails.codigoPrestamo}</span>
            </h4>
            <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-2 text-center">Nro. Cuota</th>
                    <th className="p-2 text-right">Monto Cuota</th>
                    <th className="p-2 text-right">Interés</th>
                    <th className="p-2 text-right">Capital</th>
                    <th className="p-2 text-right">Pago Acum.</th>
                    <th className="p-2 text-right">Saldo Capital</th>
                    <th className="p-2 text-center">Pagado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedLoanDetails.detalleCuotas.map((c, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-2 text-center font-medium text-gray-700 dark:text-gray-300">{c.numero}</td>
                      <td className="p-2 text-right text-gray-800 dark:text-gray-300">{currency} {c.montoCuota.toFixed(2)}</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{currency} {c.interes.toFixed(2)}</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{currency} {c.capital.toFixed(2)}</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{currency} {c.pagoAcumulado.toFixed(2)}</td>
                      <td className="p-2 text-right font-medium text-gray-800 dark:text-gray-300">{currency} {c.saldoCapital.toFixed(2)}</td>
                      <td className="p-2 text-center"><input type="checkbox" checked={c.pagado} readOnly className="rounded text-blue-600" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewLoanModal 
          employees={employees} 
          creationType={activeTab}
          currency={currency}
          onClose={() => setShowNewModal(false)}
          onSave={(newLoan) => {
            onSaveLoan(newLoan);
            setShowNewModal(false);
            setIsAllEmployees(true); 
            setActiveTab(newLoan.tipo);
          }}
        />
      )}
    </div>
  );
};

// 4. MODAL NUEVA SOLICITUD DE PRÉSTAMO
const NewLoanModal = ({ employees, onClose, onSave, creationType, currency }) => {
  const isDirectLoan = creationType === 'prestamo'; 
  const [formData, setFormData] = useState({
    employeeId: employees.length > 0 ? String(employees[0].id) : '',
    fechaCreacion: new Date().toISOString().split('T')[0],
    tipoPago: 'Mensual', nroCuotas: 6, monto: 1200, periodoAPartir: 'Enero', tasaInteres: 3.780, observacion: ''
  });

  const interesCalculado = (formData.monto * (formData.tasaInteres / 100)) * (formData.nroCuotas / 12);
  const montoTotal = Number(formData.monto) + interesCalculado;
  const valorCuota = formData.nroCuotas > 0 ? (montoTotal / formData.nroCuotas) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    const baseRecord = {
      id: Date.now().toString(),
      tipo: isDirectLoan ? 'prestamo' : 'solicitud',
      codigoSolicitud: `S000000${Math.floor(Math.random() * 900) + 100}`,
      codigoPrestamo: isDirectLoan ? `PRST000000${Math.floor(Math.random() * 900) + 100}` : null,
      employeeId: String(formData.employeeId),
      fechaCreacion: formData.fechaCreacion,
      tipoPago: formData.tipoPago,
      nroCuotas: Number(formData.nroCuotas),
      periodoAPartir: formData.periodoAPartir,
      tasaInteres: Number(formData.tasaInteres),
      monto: Number(formData.monto),
      montoInteres: interesCalculado,
      montoTotal: montoTotal,
      valorCuota: valorCuota,
      observacion: formData.observacion,
      estado: isDirectLoan ? 'Aprobado' : 'Pendiente',
      detalleCuotas: []
    };

    if (isDirectLoan) baseRecord.detalleCuotas = generarAmortizacion(baseRecord.monto, baseRecord.montoInteres, baseRecord.nroCuotas);
    onSave(baseRecord);
  };

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{isDirectLoan ? 'Nuevo Préstamo Directo' : 'Nueva Solicitud'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Trabajador</label>
            <select required name="employeeId" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
              {employees.map(emp => <option key={emp.id} value={emp.id}>{formatFullName(emp)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Creación</label>
              <input type="date" value={formData.fechaCreacion} onChange={e => setFormData({...formData, fechaCreacion: e.target.value})} required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Pago</label>
              <select value={formData.tipoPago} onChange={e => setFormData({...formData, tipoPago: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
                <option value="Mensual">Mensual</option><option value="Quincenal">Quincenal</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nro. de Cuotas</label>
              <input type="number" value={formData.nroCuotas} onChange={e => setFormData({...formData, nroCuotas: e.target.value})} min="1" required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monto a prestar ({currency})</label>
              <input type="number" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} min="1" step="any" required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodo a partir</label>
              <select value={formData.periodoAPartir} onChange={e => setFormData({...formData, periodoAPartir: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
                {meses.map(mes => <option key={mes} value={mes}>{mes}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasa Interés (%)</label>
              <input type="number" value={formData.tasaInteres} onChange={e => setFormData({...formData, tasaInteres: e.target.value})} step="any" className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 grid grid-cols-2 gap-4">
             <div><p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Monto Total Estimado</p><p className="text-xl font-bold text-gray-900 dark:text-white">{currency} {montoTotal.toFixed(2)}</p></div>
             <div><p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Valor de Cuota</p><p className="text-xl font-bold text-gray-900 dark:text-white">{currency} {valorCuota.toFixed(2)}</p></div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observación</label>
            <textarea value={formData.observacion} onChange={e => setFormData({...formData, observacion: e.target.value})} rows="2" className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"></textarea>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium">Aceptar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 5. VISTA DE VACACIONES
const VacationsView = ({ employees, vacationPeriods, vacationRequests, onSavePeriod, onDeletePeriod, onSaveRequest, onDeleteRequest, onProcessRequest }) => {
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [isAllEmployees, setIsAllEmployees] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPeriodForRequest, setSelectedPeriodForRequest] = useState(null);
  const [selectedPeriodDetails, setSelectedPeriodDetails] = useState(null);

  const displayedPeriods = useMemo(() => {
    let data = vacationPeriods;
    if (!isAllEmployees && selectedEmpId) data = data.filter(p => String(p.employeeId) === String(selectedEmpId));
    return data;
  }, [vacationPeriods, isAllEmployees, selectedEmpId]);

  const displayedRequests = useMemo(() => {
    let data = vacationRequests;
    if (!isAllEmployees && selectedEmpId) data = data.filter(r => String(r.employeeId) === String(selectedEmpId));
    return data;
  }, [vacationRequests, isAllEmployees, selectedEmpId]);

  const getEmployeeName = (id) => formatFullName(employees.find(e => String(e.id) === String(id)));
  const getPeriodName = (id) => vacationPeriods.find(p => String(p.id) === String(id))?.periodo || 'Periodo Desconocido';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Vacaciones</h2>
        <div className="flex gap-2">
          {activeTab === 'periodos' ? (
            <button onClick={() => setShowPeriodModal(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
              <CalendarDays size={18} /><span>Nuevo Periodo</span>
            </button>
          ) : (
            <button onClick={() => { setSelectedPeriodForRequest(null); setShowRequestModal(true); }} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
              <PlaneTakeoff size={18} /><span>Tomar / Vender</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex bg-gray-200/50 dark:bg-gray-800 p-1 rounded-lg w-fit border border-gray-200 dark:border-gray-700">
              <button onClick={() => setActiveTab('solicitudes')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'solicitudes' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>Solicitudes</button>
              <button onClick={() => setActiveTab('periodos')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'periodos' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}>Periodos Pendientes</button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={isAllEmployees} onChange={(e) => setIsAllEmployees(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500"/> Todos
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Trabajador:</span>
                <select disabled={isAllEmployees} value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none disabled:opacity-50">
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{formatFullName(emp)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[250px]">
          {activeTab === 'periodos' ? (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3 font-semibold">Trabajador</th><th className="p-3 font-semibold">Periodo Vacaciones</th>
                  <th className="p-3 font-semibold text-center">Días Otorgados</th><th className="p-3 font-semibold text-center text-indigo-600 dark:text-indigo-400">Saldo</th>
                  <th className="p-3 font-semibold text-center">Días Inhábiles</th><th className="p-3 font-semibold text-center">Rem. Íntegra</th>
                  <th className="p-3 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {displayedPeriods.map(p => (
                  <tr key={p.id} onClick={() => setSelectedPeriodDetails(p)} className={`transition-colors cursor-pointer ${selectedPeriodDetails?.id === p.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{getEmployeeName(p.employeeId)}</td>
                    <td className="p-3 text-gray-800 dark:text-gray-300">{p.periodo}</td>
                    <td className="p-3 text-center text-gray-800 dark:text-gray-300">{p.diasOtorgados}</td>
                    <td className="p-3 text-center font-bold text-gray-900 dark:text-white">{p.saldo}</td>
                    <td className="p-3 text-center text-gray-800 dark:text-gray-300">{p.diasInhabiles}</td>
                    <td className="p-3 text-center"><input type="checkbox" checked={p.remIntegra} readOnly className="rounded text-indigo-600"/></td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedPeriodForRequest(p); setShowRequestModal(true); }} className="px-2 py-1 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded transition-colors" title="Crear Solicitud desde este Periodo">Tomar/Vender</button>
                      <button onClick={(e) => { e.stopPropagation(); onDeletePeriod(p.id); if (selectedPeriodDetails?.id === p.id) setSelectedPeriodDetails(null); }} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3 font-semibold">Trabajador</th><th className="p-3 font-semibold">Periodo Afectado</th>
                  <th className="p-3 font-semibold text-center">Opción</th><th className="p-3 font-semibold">Salida</th>
                  <th className="p-3 font-semibold">Retorno</th><th className="p-3 font-semibold text-center">Total Días</th>
                  <th className="p-3 font-semibold text-center">Estado</th><th className="p-3 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {displayedRequests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{getEmployeeName(r.employeeId)}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 text-xs">{getPeriodName(r.periodId)}</td>
                    <td className="p-3 text-center text-gray-800 dark:text-gray-300 font-medium">{r.opcion}</td>
                    <td className="p-3 text-gray-800 dark:text-gray-300">{r.fechaSalida}</td>
                    <td className="p-3 text-gray-800 dark:text-gray-300">{r.fechaRetorno}</td>
                    <td className="p-3 text-center font-bold text-gray-900 dark:text-white">{r.totalDias}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-1 text-xs font-medium rounded-full ${r.estado === 'Aprobado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.estado}</span></td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      {r.estado === 'Pendiente' && (
                        <button onClick={(e) => { e.stopPropagation(); onProcessRequest(r); }} className="px-2 py-1 flex items-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"><CheckCircle size={14} /> Procesar</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(r.id); }} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {((activeTab === 'periodos' && displayedPeriods.length === 0) || (activeTab === 'solicitudes' && displayedRequests.length === 0)) && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No hay registros para mostrar.</div>
          )}
        </div>

        {activeTab === 'periodos' && selectedPeriodDetails && (
          <div className="border-t-4 border-gray-200 dark:border-gray-900 bg-gray-50 dark:bg-gray-800/80 p-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <CalendarDays size={16} /> Detalle de Vacaciones: <span className="text-indigo-600 dark:text-indigo-400">{selectedPeriodDetails.periodo}</span>
            </h4>
            <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-2">Periodo Vacacional</th><th className="p-2">Salida</th><th className="p-2">Retorno</th>
                    <th className="p-2 text-center">Días Otorgados</th><th className="p-2 text-center">Días Tomados</th>
                    <th className="p-2 text-center">Días Inhábiles</th><th className="p-2 text-center">Saldo</th><th className="p-2 text-center">Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {vacationRequests.filter(r => String(r.periodId) === String(selectedPeriodDetails.id) && r.estado === 'Aprobado').map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-2 font-medium text-gray-700 dark:text-gray-300">{selectedPeriodDetails.periodo}</td>
                      <td className="p-2 text-gray-800 dark:text-gray-300">{r.fechaSalida?.split('-').reverse().join('/') || ''}</td>
                      <td className="p-2 text-gray-800 dark:text-gray-300">{r.fechaRetorno?.split('-').reverse().join('/') || ''}</td>
                      <td className="p-2 text-center text-gray-600 dark:text-gray-400">{selectedPeriodDetails.diasOtorgados}</td>
                      <td className="p-2 text-center text-gray-600 dark:text-gray-400">{r.totalDias}</td>
                      <td className="p-2 text-center text-gray-600 dark:text-gray-400">{r.diasInhabiles || 0}</td>
                      <td className="p-2 text-center font-medium text-gray-800 dark:text-gray-300">{selectedPeriodDetails.saldo}</td>
                      <td className="p-2 text-center"><input type="checkbox" checked={r.opcion === 'Vender'} readOnly className="rounded text-indigo-600" /></td>
                    </tr>
                  ))}
                  {vacationRequests.filter(r => String(r.periodId) === String(selectedPeriodDetails.id) && r.estado === 'Aprobado').length === 0 && (
                    <tr><td colSpan="8" className="p-4 text-center text-gray-500">No hay vacaciones tomadas o vendidas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showPeriodModal && (
        <NewPeriodModal 
          employees={employees} 
          onClose={() => setShowPeriodModal(false)}
          onSave={(newPeriod) => { onSavePeriod(newPeriod); setShowPeriodModal(false); setIsAllEmployees(true); }}
        />
      )}
      {showRequestModal && (
        <TakeVacationModal
          employees={employees} vacationPeriods={vacationPeriods} preSelectedPeriod={selectedPeriodForRequest}
          onClose={() => setShowRequestModal(false)}
          onSave={(newReq) => { onSaveRequest(newReq); setShowRequestModal(false); setActiveTab('solicitudes'); setIsAllEmployees(true); }}
        />
      )}
    </div>
  );
};

// MODAL NUEVO PERIODO
const NewPeriodModal = ({ employees, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    employeeId: employees.length > 0 ? String(employees[0].id) : '',
    fechaInicio: new Date().toISOString().split('T')[0], diasOtorgados: 30, saldo: 30, remIntegra: false
  });

  const fechaFinCalc = addOneYear(formData.fechaInicio);
  const periodoString = `${formData.fechaInicio.split('-').reverse().join('/')} - ${fechaFinCalc.split('-').reverse().join('/')}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employeeId) return;
    onSave({
      id: Date.now().toString(),
      employeeId: String(formData.employeeId),
      fechaInicio: formData.fechaInicio, fechaFin: fechaFinCalc, periodo: periodoString,
      diasOtorgados: Number(formData.diasOtorgados), saldo: Number(formData.saldo),
      diasInhabiles: 0, remIntegra: formData.remIntegra
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Nuevo periodo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Trabajador</label>
            <select required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
              {employees.map(emp => <option key={emp.id} value={emp.id}>{formatFullName(emp)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodo vacacional (Desde)</label>
            <input type="date" value={formData.fechaInicio} onChange={e => setFormData({...formData, fechaInicio: e.target.value})} required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded text-center text-indigo-800 dark:text-indigo-300 text-sm font-medium">
            Hasta: {fechaFinCalc.split('-').reverse().join('/')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Días otorgados</label>
              <input type="number" value={formData.diasOtorgados} onChange={e => setFormData({...formData, diasOtorgados: e.target.value, saldo: e.target.value})} min="1" required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo</label>
              <input type="number" value={formData.saldo} onChange={e => setFormData({...formData, saldo: e.target.value})} min="0" required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-medium">Aceptar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// MODAL TOMAR VACACIONES
const TakeVacationModal = ({ employees, vacationPeriods, preSelectedPeriod, onClose, onSave }) => {
  const defaultEmp = preSelectedPeriod ? String(preSelectedPeriod.employeeId) : (employees.length > 0 ? String(employees[0].id) : '');
  
  const [formData, setFormData] = useState({
    employeeId: defaultEmp, periodId: preSelectedPeriod ? String(preSelectedPeriod.id) : '',
    opcion: 'Tomar', fechaSalida: new Date().toISOString().split('T')[0], fechaRetorno: '',
    totalDias: 0, diasInhabiles: 0
  });

  const availablePeriods = vacationPeriods.filter(p => String(p.employeeId) === String(formData.employeeId));
  const selectedPeriodData = vacationPeriods.find(p => String(p.id) === String(formData.periodId));

  useEffect(() => {
    if (formData.fechaSalida && formData.fechaRetorno) {
      const diff = calculateDaysDiff(formData.fechaSalida, formData.fechaRetorno);
      const weekends = calculateWeekends(formData.fechaSalida, formData.fechaRetorno);
      setFormData(prev => ({ ...prev, totalDias: diff, diasInhabiles: weekends }));
    }
  }, [formData.fechaSalida, formData.fechaRetorno]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.periodId || !formData.employeeId) return;
    onSave({
      id: Date.now().toString(),
      employeeId: String(formData.employeeId),
      periodId: String(formData.periodId),
      opcion: formData.opcion, fechaSalida: formData.fechaSalida, fechaRetorno: formData.fechaRetorno,
      totalDias: Number(formData.totalDias), diasInhabiles: Number(formData.diasInhabiles),
      estado: 'Pendiente'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Solicitar Vacaciones</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Trabajador</label>
            <select disabled={!!preSelectedPeriod} value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value, periodId: ''})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
              {employees.map(emp => <option key={emp.id} value={emp.id}>{formatFullName(emp)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodo a afectar</label>
            <select required disabled={!!preSelectedPeriod} value={formData.periodId} onChange={e => setFormData({...formData, periodId: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
              <option value="">-- Seleccione un Periodo --</option>
              {availablePeriods.map(p => <option key={p.id} value={p.id}>{p.periodo} (Saldo: {p.saldo})</option>)}
            </select>
          </div>
          <div className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
             <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
               <input type="radio" value="Tomar" checked={formData.opcion === 'Tomar'} onChange={e => setFormData({...formData, opcion: e.target.value})} className="text-indigo-600" /> Tomar
             </label>
             <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
               <input type="radio" value="Vender" checked={formData.opcion === 'Vender'} onChange={e => setFormData({...formData, opcion: e.target.value})} className="text-indigo-600" /> Vender
             </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Salida</label><input type="date" value={formData.fechaSalida} onChange={e => setFormData({...formData, fechaSalida: e.target.value})} required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Retorno</label><input type="date" value={formData.fechaRetorno} onChange={e => setFormData({...formData, fechaRetorno: e.target.value})} required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total días</label>
              <input type="number" value={formData.totalDias} onChange={e => setFormData({...formData, totalDias: e.target.value})} min="1" max={selectedPeriodData?.saldo || 30} required className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white font-bold text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Días inhábiles</label>
              <input type="number" value={formData.diasInhabiles} onChange={e => setFormData({...formData, diasInhabiles: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-medium">Aceptar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 6. FORMULARIO DE EMPLEADO
const EmployeeFormView = ({ employee, onSave, onCancel, currency }) => {
  const isEdit = !!employee;
  const [formData, setFormData] = useState(employee || { 
    dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', nacionalidad: 'Peruana', correo: '',
    cargo: '', sueldoBase: '', fechaIngreso: new Date().toISOString().split('T')[0], estado: 'Activo' 
  });

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{isEdit ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">DNI</label><input required type="text" name="dni" value={formData.dni} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombres</label><input required type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apellido Paterno</label><input required type="text" name="apellidoPaterno" value={formData.apellidoPaterno} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apellido Materno</label><input required type="text" name="apellidoMaterno" value={formData.apellidoMaterno} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nacionalidad</label>
              <select name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                <option value="Peruana">Peruana</option><option value="Venezolana">Venezolana</option><option value="Colombiana">Colombiana</option><option value="Argentina">Argentina</option><option value="Chilena">Chilena</option><option value="Otra">Otra</option>
              </select>
            </div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Correo</label><input required type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cargo</label><input required type="text" name="cargo" value={formData.cargo} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sueldo Base ({currency})</label><input required type="number" name="sueldoBase" value={formData.sueldoBase} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Ingreso</label><input required type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
              <select name="estado" value={formData.estado} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500">
                <option value="Activo">Activo</option><option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">{isEdit ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 7. VISTA DE CONFIGURACIÓN
const ConfigurationView = ({ darkMode, setDarkMode, currency, setCurrency }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración del Sistema</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"><Settings size={20} className="text-blue-600 dark:text-blue-400" /> Apariencia y Regionalización</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Preferencias guardadas automáticamente en tu navegador.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Modo Oscuro</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mejora la lectura en entornos oscuros.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>
              <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Moneda del Sistema</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona el símbolo de moneda base.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrency('S/.')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${currency === 'S/.' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Soles (S/.)</button>
              <button onClick={() => setCurrency('$')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${currency === '$' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Dólares ($)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// APLICACIÓN PRINCIPAL (LAYOUT & AUTH & DB)
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

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
  const [isMantenimientoMenuOpen, setIsMantenimientoMenuOpen] = useState(true);
  const [isConsultasMenuOpen, setIsConsultasMenuOpen] = useState(false); 

  // Guardar LocalStorage
  useEffect(() => { localStorage.setItem('theme', darkMode ? 'dark' : 'light'); }, [darkMode]);
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);

  // Firebase Auth Listener
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) { console.error(e); }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore DB Listeners
  useEffect(() => {
    if (!user || !db) return;
    
    const unsubEmp = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'employees'), (snap) => setEmployees(snap.docs.map(d => d.data())), console.error);
    const unsubLoans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), (snap) => setLoans(snap.docs.map(d => d.data())), console.error);
    const unsubVacP = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods'), (snap) => setVacationPeriods(snap.docs.map(d => d.data())), console.error);
    const unsubVacR = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests'), (snap) => setVacationRequests(snap.docs.map(d => d.data())), console.error);

    return () => { unsubEmp(); unsubLoans(); unsubVacP(); unsubVacR(); };
  }, [user]);

  // Handlers Login
  const loginWithGoogle = async () => {
    setActionLoading(true); setLoginError('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (err) { setLoginError('Error al conectar con Google.'); setActionLoading(false); }
  };
  const loginAsGuest = async () => {
    setActionLoading(true); setLoginError('');
    try { await signInAnonymously(auth); } 
    catch (err) { setLoginError('Error al entrar como invitado.'); setActionLoading(false); }
  };

  const navigateTo = (view) => { setCurrentView(view); setSidebarOpen(false); };

  // ================= CRUD CLOUD =================
  const handleSaveEmployee = async (data) => {
    if (!user || !db) return;
    const isNew = !editingEmployee;
    const id = isNew ? Date.now().toString() : editingEmployee.id.toString();
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', id), { ...data, id });
    if (isNew && data.fechaIngreso) {
      const fechaFin = addOneYear(data.fechaIngreso);
      const periodoStr = `${data.fechaIngreso.split('-').reverse().join('/')} - ${fechaFin.split('-').reverse().join('/')}`;
      const periodId = (Date.now() + 1).toString();
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', periodId), {
        id: periodId, employeeId: id, periodo: periodoStr, fechaInicio: data.fechaIngreso,
        fechaFin: fechaFin, diasOtorgados: 30, saldo: 30, diasInhabiles: 0, remIntegra: false
      });
    }
    navigateTo('employees');
  };
  const handleDeleteEmployee = async (id) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', id.toString()));
  };

  const handleSaveLoan = async (newLoan) => {
    if (!user || !db) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', newLoan.id.toString()), newLoan);
  };
  const handleDeleteLoan = async (id) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', id.toString()));
  };
  const handleProcessLoan = async (loanId) => {
    if (!user || !db) return;
    const loan = loans.find(l => String(l.id) === String(loanId));
    if (!loan) return;
    const updatedLoan = {
      ...loan, tipo: 'prestamo', codigoPrestamo: `PRST000000${loan.id.slice(-4)}`, estado: 'Aprobado',
      detalleCuotas: generarAmortizacion(loan.monto, loan.montoInteres, loan.nroCuotas)
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', loanId.toString()), updatedLoan);
  };

  const handleSaveVacationPeriod = async (period) => {
    if (!user || !db) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', period.id.toString()), period);
  };
  const handleDeleteVacationPeriod = async (id) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', id.toString()));
  };
  const handleSaveVacationRequest = async (req) => {
    if (!user || !db) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', req.id.toString()), req);
  };
  const handleDeleteVacationRequest = async (id) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', id.toString()));
  };
  const handleProcessVacationRequest = async (req) => {
    if (!user || !db) return;
    const period = vacationPeriods.find(p => String(p.id) === String(req.periodId));
    if (period) {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', period.id.toString()), {
        ...period, saldo: period.saldo - req.totalDias
      });
    }
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', req.id.toString()), {
      ...req, estado: 'Aprobado'
    });
  };

  // Renderizadores de estado inicial
  if (authLoading) {
    return <div className={`h-screen w-screen flex items-center justify-center transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }
  if (!user) {
    return <LoginView onGoogle={loginWithGoogle} onGuest={loginAsGuest} loading={actionLoading} error={loginError} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView employees={employees} currency={currency} />;
      case 'employees': return <EmployeesView employees={employees} onAdd={() => { setEditingEmployee(null); navigateTo('employee_form'); }} onEdit={(e) => { setEditingEmployee(e); navigateTo('employee_form'); }} onDelete={handleDeleteEmployee} currency={currency} />;
      case 'employee_form': return <EmployeeFormView employee={editingEmployee} currency={currency} onSave={handleSaveEmployee} onCancel={() => navigateTo('employees')} />;
      case 'consultas_prestamos': return <LoansView employees={employees} loans={loans} onSaveLoan={handleSaveLoan} onDeleteLoan={handleDeleteLoan} onProcessLoan={handleProcessLoan} currency={currency} />;
      case 'consultas_vacaciones': return <VacationsView employees={employees} vacationPeriods={vacationPeriods} vacationRequests={vacationRequests} onSavePeriod={handleSaveVacationPeriod} onDeletePeriod={handleDeleteVacationPeriod} onSaveRequest={handleSaveVacationRequest} onDeleteRequest={handleDeleteVacationRequest} onProcessRequest={handleProcessVacationRequest} />;
      case 'configuracion': return <ConfigurationView darkMode={darkMode} setDarkMode={setDarkMode} currency={currency} setCurrency={setCurrency} />;
      default: return <DashboardView employees={employees} currency={currency} />;
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
        
        {/* SIDEBAR */}
        {isSidebarOpen && <div className="fixed inset-0 bg-gray-900/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
        
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-gray-300 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">E</div>
              <span className="text-white font-bold text-xl tracking-wide">ERP Pro</span>
            </div>
            <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <button onClick={() => navigateTo('dashboard')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard size={20} /><span className="font-medium">Dashboard</span>
            </button>

            {/* Módulo Planilla */}
            <div className="pt-2">
              <button onClick={() => setIsPlanillaMenuOpen(!isPlanillaMenuOpen)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <div className="flex items-center space-x-3"><Briefcase size={20} /><span className="font-medium text-gray-200">Planilla</span></div>
                {isPlanillaMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isPlanillaMenuOpen && (
                <div className="mt-1 space-y-1 pl-10 border-l border-slate-700 ml-5">
                  <div>
                    <button onClick={() => setIsMantenimientoMenuOpen(!isMantenimientoMenuOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 transition-colors text-sm">
                      <span>Mantenimiento</span>{isMantenimientoMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isMantenimientoMenuOpen && (
                      <div className="mt-1 space-y-1 pl-4">
                        <button onClick={() => navigateTo('employees')} className={`w-full flex items-center px-3 py-1.5 rounded-lg transition-colors text-xs ${['employees', 'employee_form'].includes(currentView) ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-gray-200'}`}>• Trabajadores</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <button onClick={() => setIsConsultasMenuOpen(!isConsultasMenuOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 transition-colors text-sm">
                      <span>Consultas</span>{isConsultasMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isConsultasMenuOpen && (
                      <div className="mt-1 space-y-1 pl-4">
                        <button onClick={() => navigateTo('consultas_prestamos')} className={`w-full flex items-center px-3 py-1.5 rounded-lg transition-colors text-xs ${currentView === 'consultas_prestamos' ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-gray-200'}`}>• Préstamos</button>
                        <button onClick={() => navigateTo('consultas_vacaciones')} className={`w-full flex items-center px-3 py-1.5 rounded-lg transition-colors text-xs ${currentView === 'consultas_vacaciones' ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-gray-200'}`}>• Vacaciones</button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => navigateTo('configuracion')} className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${currentView === 'configuracion' ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-gray-200'}`}>Configuración</button>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800">
              <button onClick={() => navigateTo('configuracion')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${currentView === 'configuracion' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}>
                <Settings size={20} />
                <span className="font-medium">Configuración Global</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 z-10 transition-colors">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"><Menu size={24} /></button>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white hidden sm:block">
                {currentView === 'dashboard' && 'Inicio'}
                {['employees', 'employee_form'].includes(currentView) && 'Mantenimiento: Trabajadores'}
                {currentView === 'consultas_prestamos' && 'Consultas: Préstamos y Solicitudes'}
                {currentView === 'consultas_vacaciones' && 'Consultas: Vacaciones y Periodos'}
                {currentView === 'configuracion' && 'Configuración del Sistema'}
              </h1>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"><Sun size={20} className="hidden dark:block" /><Moon size={20} className="dark:hidden" /></button>
              <div className="flex items-center space-x-3 pl-2 border-l border-gray-200 dark:border-gray-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Perfil" className="w-8 h-8 rounded-full border border-blue-200 dark:border-blue-800" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'I'}
                  </div>
                )}
                <div className="hidden sm:block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block leading-tight">{user.displayName || 'Invitado'}</span>
                  <button onClick={() => signOut(auth)} className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1">
                    <LogOut size={12} /> Salir
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {renderView()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}