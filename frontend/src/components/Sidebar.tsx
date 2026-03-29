import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, CreditCard, Settings, Dumbbell } from 'lucide-react';

const navItems = [
  { to: '/',            label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/alunos',      label: 'Alunos',         icon: Users },
  { to: '/planos',      label: 'Planos',          icon: FileText },
  { to: '/financeiro',  label: 'Financeiro',      icon: CreditCard },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen flex-shrink-0">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
            <Dumbbell size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">AcademiaOS</p>
            <p className="text-xs text-gray-400 mt-0.5">Gestão Inteligente</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="bg-red-50 rounded-xl px-3 py-2.5">
          <p className="text-xs font-semibold text-red-800">Plano: Academia Pro</p>
          <p className="text-xs text-red-500 mt-0.5">Todas as funcionalidades</p>
        </div>
      </div>
    </aside>
  );
}
