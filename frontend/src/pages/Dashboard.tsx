// =============================================================
// frontend/src/pages/Dashboard.tsx
// Cards de métricas + alunos inadimplentes em destaque vermelho
// =============================================================
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Users, CreditCard, AlertTriangle, TrendingUp,
  Clock, CheckCircle, UserCheck
} from 'lucide-react';

interface Metricas {
  totalAlunos: number;
  alunosAtivos: number;
  matriculasAtivas: number;
  pagamentosHoje: number;
  inadimplentesCount: number;
  vencendo7Dias: number;
  receitaMes: string;
}

interface Inadimplente {
  pagamentoId: string;
  aluno: { id: string; nome: string; cpf: string; telefone?: string };
  plano: { nome: string };
  valor: string;
  dataVencimento: string;
  diasEmAtraso: number;
}

// ── Card de Métrica ───────────────────────────────────────────
interface MetricCardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icon: React.ReactNode;
  tipo?: 'padrao' | 'alerta' | 'sucesso' | 'aviso';
}

function MetricCard({ titulo, valor, subtitulo, icon, tipo = 'padrao' }: MetricCardProps) {
  const estilos = {
    padrao: 'border-gray-200 bg-white',
    alerta: 'border-red-200 bg-red-50',
    sucesso: 'border-green-200 bg-green-50',
    aviso: 'border-amber-200 bg-amber-50',
  };

  const iconeEstilos = {
    padrao: 'bg-gray-100 text-gray-600',
    alerta: 'bg-red-100 text-red-600',
    sucesso: 'bg-green-100 text-green-600',
    aviso: 'bg-amber-100 text-amber-600',
  };

  const valorEstilos = {
    padrao: 'text-gray-900',
    alerta: 'text-red-700',
    sucesso: 'text-green-700',
    aviso: 'text-amber-700',
  };

  return (
    <div className={`rounded-2xl border-2 p-6 shadow-sm transition-all hover:shadow-md ${estilos[tipo]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{titulo}</p>
          <p className={`text-3xl font-bold mt-1 ${valorEstilos[tipo]}`}>{valor}</p>
          {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconeEstilos[tipo]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Linha de Inadimplente ─────────────────────────────────────
function InadimplenteRow({ item }: { item: Inadimplente }) {
  return (
    <tr className="hover:bg-red-50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{item.aluno.nome}</p>
          <p className="text-xs text-gray-400">{item.aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{item.plano.nome}</td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-red-600">
          R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
          <AlertTriangle size={10} />
          {item.diasEmAtraso} {item.diasEmAtraso === 1 ? 'dia' : 'dias'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.aluno.telefone || '—'}</td>
      <td className="px-4 py-3">
        <button className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
          Cobrar
        </button>
      </td>
    </tr>
  );
}

// ── Dashboard Principal ───────────────────────────────────────
export function Dashboard() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [met, inad] = await Promise.all([
          api.get('/dashboard/metricas'),
          api.get('/pagamentos/inadimplentes'),
        ]);
        setMetricas(met.data);
        setInadimplentes(inad.data.data.slice(0, 8)); // top 8 no dashboard
      } catch (err) {
        console.error(err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visão geral da academia · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard
          titulo="Alunos Ativos"
          valor={metricas?.alunosAtivos ?? 0}
          subtitulo={`de ${metricas?.totalAlunos ?? 0} cadastrados`}
          icon={<Users size={22} />}
          tipo="padrao"
        />
        <MetricCard
          titulo="Matrículas Ativas"
          valor={metricas?.matriculasAtivas ?? 0}
          subtitulo="planos em vigência"
          icon={<UserCheck size={22} />}
          tipo="sucesso"
        />
        <MetricCard
          titulo="Inadimplentes"
          valor={metricas?.inadimplentesCount ?? 0}
          subtitulo="pagamentos em atraso"
          icon={<AlertTriangle size={22} />}
          tipo={metricas && metricas.inadimplentesCount > 0 ? 'alerta' : 'padrao'}
        />
        <MetricCard
          titulo="Receita do Mês"
          valor={`R$ ${Number(metricas?.receitaMes ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitulo="pagamentos confirmados"
          icon={<TrendingUp size={22} />}
          tipo="padrao"
        />
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <MetricCard
          titulo="Pagos Hoje"
          valor={metricas?.pagamentosHoje ?? 0}
          subtitulo="confirmações de hoje"
          icon={<CheckCircle size={22} />}
          tipo="sucesso"
        />
        <MetricCard
          titulo="Vencem em 7 dias"
          valor={metricas?.vencendo7Dias ?? 0}
          subtitulo="matrículas próximas do vencimento"
          icon={<Clock size={22} />}
          tipo={metricas && metricas.vencendo7Dias > 0 ? 'aviso' : 'padrao'}
        />
        <MetricCard
          titulo="Pagamentos"
          valor={metricas?.pagamentosHoje ?? 0}
          subtitulo="registrados hoje"
          icon={<CreditCard size={22} />}
          tipo="padrao"
        />
      </div>

      {/* Tabela de Inadimplentes */}
      {inadimplentes.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <h2 className="font-bold text-red-800 text-sm uppercase tracking-wide">
                Alunos Inadimplentes
              </h2>
            </div>
            <span className="text-xs text-red-600 font-semibold bg-red-100 px-2 py-1 rounded-full">
              {inadimplentes.length} alunos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Aluno', 'Plano', 'Valor', 'Atraso', 'Telefone', 'Ação'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inadimplentes.map((item) => (
                  <InadimplenteRow key={item.pagamentoId} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t text-right">
            <a href="/inadimplentes" className="text-xs text-red-600 hover:text-red-800 font-semibold underline">
              Ver todos os inadimplentes →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
