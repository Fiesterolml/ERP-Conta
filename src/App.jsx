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
  const configToUse = (typeof window !== 'undefined' && window.__firebase_config) ? JSON.parse(window.__firebase_config) : myFirebaseConfig;
  
  app = initializeApp(configToUse);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Limpieza del appId para evitar errores de segmentos en la ruta de Firestore
  const rawAppId = (typeof window !== 'undefined' && window.__app_id) ? window.__app_id : 'erp-prototype';
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
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold">DNI</th>
                <th className="p-4 font-semibold">Nombre Completo</th>
                <th className="p-4 font-semibold text-right">Sueldo Base</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="p-4 text-gray-800 dark:text-gray-200">{emp.dni}</td>
                  <td className="p-4 font-medium text-gray-900 dark:text-white">{formatFullName(emp)}</td>
                  <td className="p-4 text-right font-medium text-blue-600 dark:text-blue-400">{currency} {emp.sueldoBase}</td>
                  <td className="p-4 flex justify-end gap-2">
                    <button onClick={() => onEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 rounded-lg"><Edit2 size={18} /></button>
                    <button onClick={() => onDelete(emp.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 rounded-lg"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EmployeeFormView = ({ employee, onSave, onCancel, currency }) => {
  const isEdit = !!employee;
  const [formData, setFormData] = useState(employee || { 
    dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', nacionalidad: 'Peruana', correo: '',
    cargo: '', sueldoBase: '', fechaIngreso: new Date().toISOString().split('T')[0], estado: 'Activo' 
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
      setSaveError("No se pudo guardar. Verifica tu conexión o configuración de Firestore.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{isEdit ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
      {saveError && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><AlertCircle size={20}/>{saveError}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">DNI</label><input required name="dni" value={formData.dni} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Nombres</label><input required name="nombres" value={formData.nombres} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Ap. Paterno</label><input required name="apellidoPaterno" value={formData.apellidoPaterno} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Ap. Materno</label><input required name="apellidoMaterno" value={formData.apellidoMaterno} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="space-y-1"><label className="text-sm font-medium dark:text-gray-300">Sueldo Base ({currency})</label><input required type="number" step="any" name="sueldoBase" value={formData.sueldoBase} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600" /></div>
        <div className="col-span-full flex justify-end gap-3 mt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
          <button type="submit" disabled={isSaving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Modo Oscuro</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mejora la lectura en entornos oscuros.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)}/>
            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Moneda</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona el símbolo de moneda base.</p>
          </div>
          <div className="flex gap-2">
            {['S/.', '$'].map(c => (
              <button key={c} onClick={() => setCurrency(c)} className={`px-4 py-2 rounded-lg border ${currency === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white'}`}>{c}</button>
            ))}
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

  // EFECTO PARA MODO OSCURO GLOBAL
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
    
    const handleDbError = (err) => {
      setSyncError("Error de sincronización con la base de datos.");
    };

    const unsubEmp = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'employees'), 
      (snap) => { setEmployees(snap.docs.map(d => d.data())); setSyncError(''); }, handleDbError);
    const unsubLoans = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'loans'), 
      (snap) => setLoans(snap.docs.map(d => d.data())), handleDbError);
    const unsubVacP = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods'), 
      (snap) => setVacationPeriods(snap.docs.map(d => d.data())), handleDbError);
    const unsubVacR = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests'), 
      (snap) => setVacationRequests(snap.docs.map(d => d.data())), handleDbError);

    return () => { unsubEmp(); unsubLoans(); unsubVacP(); unsubVacR(); };
  }, [user]);

  const loginWithGoogle = async () => {
    setActionLoading(true); setLoginError('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (err) { setLoginError('Error al conectar con Google.'); setActionLoading(false); }
  };

  const navigateTo = (view) => { setCurrentView(view); setSidebarOpen(false); };

  const handleSaveEmployee = async (data) => {
    if (!user || !db) throw new Error("DB No inicializada");
    const id = editingEmployee ? editingEmployee.id.toString() : Date.now().toString();
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', id), { ...data, id });
    
    if (!editingEmployee && data.fechaIngreso) {
      const fechaFin = addOneYear(data.fechaIngreso);
      const periodId = (Date.now() + 1).toString();
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', periodId), {
        id: periodId, employeeId: id, periodo: `${data.fechaIngreso} - ${fechaFin}`, 
        diasOtorgados: 30, saldo: 30, remIntegra: false
      });
    }
    navigateTo('employees');
  };

  const handleDeleteEmployee = async (id) => {
    if (!user || !db) return;
    const empId = id.toString();
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'employees', empId));
    
    // Borrado en cascada manual
    loans.filter(l => String(l.employeeId) === empId).forEach(l => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'loans', l.id.toString())));
    vacationPeriods.filter(p => String(p.employeeId) === empId).forEach(p => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationPeriods', p.id.toString())));
    vacationRequests.filter(r => String(r.employeeId) === empId).forEach(r => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vacationRequests', r.id.toString())));
  };

  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!user) return <LoginView onGoogle={loginWithGoogle} onGuest={() => signInAnonymously(auth)} loading={actionLoading} error={loginError} darkMode={darkMode} setDarkMode={setDarkMode} />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView employees={employees} currency={currency} />;
      case 'employees': return <EmployeesView employees={employees} onAdd={() => { setEditingEmployee(null); navigateTo('employee_form'); }} onEdit={(e) => { setEditingEmployee(e); navigateTo('employee_form'); }} onDelete={handleDeleteEmployee} currency={currency} />;
      case 'employee_form': return <EmployeeFormView employee={editingEmployee} currency={currency} onSave={handleSaveEmployee} onCancel={() => navigateTo('employees')} />;
      case 'configuracion': return <ConfigurationView darkMode={darkMode} setDarkMode={setDarkMode} currency={currency} setCurrency={setCurrency} />;
      default: return <DashboardView employees={employees} currency={currency} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors font-sans">
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-gray-300 transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 font-bold text-xl text-white">ERP Pro</div>
        <nav className="p-4 space-y-2">
          <button onClick={() => navigateTo('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20}/>Dashboard</button>
          <button onClick={() => setIsPlanillaMenuOpen(!isPlanillaMenuOpen)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800"><div className="flex items-center gap-3"><Briefcase size={20}/>Planilla</div>{isPlanillaMenuOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
          {isPlanillaMenuOpen && (
            <div className="ml-9 space-y-1">
              <button onClick={() => navigateTo('employees')} className={`w-full text-left p-2 text-sm rounded ${currentView === 'employees' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>• Trabajadores</button>
            </div>
          )}
          <button onClick={() => navigateTo('configuracion')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${currentView === 'configuracion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Settings size={20}/>Configuración</button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {syncError && <div className="bg-red-600 text-white p-2 text-center text-xs flex items-center justify-center gap-2"><AlertCircle size={14}/>{syncError}</div>}
        <header className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500"><Menu size={24}/></button>
          <div className="flex items-center gap-4">
             <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 dark:text-gray-400">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
             <div className="flex items-center gap-2 border-l pl-4 dark:border-gray-700">
               <span className="text-sm font-medium dark:text-gray-200">{user.displayName || 'Usuario'}</span>
               <button onClick={() => signOut(auth)} className="text-red-500 hover:text-red-600"><LogOut size={18}/></button>
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{renderView()}</div>
      </main>
    </div>
  );
}