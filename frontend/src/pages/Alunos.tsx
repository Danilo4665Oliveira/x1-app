// =============================================================
// frontend/src/pages/Alunos.tsx
// Tabela de alunos com paginação, filtros e status financeiro
// =============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Clock, UserX, RefreshCw
} from 'lucide-react';
import { ModalAluno } from '../components/ModalAluno';

interface Aluno {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
  statusFinanceiro: 'EM_DIA' | 'PENDENTE' | 'ATRASADO' | 'SEM_MATRICULA';
  matriculaAtiva?: {
    plano: { nome: string };
    dataFim: string;
    diasParaVencer: number;
  } | null;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Badge de Status Financeiro ────────────────────────────────
function StatusBadge({ status }: { status: Aluno['statusFinanceiro'] }) {
  const config = {
    EM_DIA: {
      label: 'Em dia',
      class: 'bg-green-100 text-green-700 border-green-200',
      icon: <CheckCircle2 size={11} />,
    },
    PENDENTE: {
      label: 'Pendente',
      class: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <Clock size={11} />,
    },
    ATRASADO: {
      label: 'Atrasado',
      class: 'bg-red-100 text-red-700 border-red-200',
      icon: <AlertCircle size={11} />,
    },
    SEM_MATRICULA: {
      label: 'Sem matrícula',
      class: 'bg-gray-100 text-gray-500 border-gray-200',
      icon: <UserX size={11} />,
    },
  };

  const { label, class: cls, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {icon} {label}
    </span>
  );
}

// ── Chip de dias para vencer ──────────────────────────────────
function DiasVencer({ dias }: { dias: number }) {
  if (dias < 0) return <span className="text-red-600 text-xs font-bold">Expirado</span>;
  if (dias <= 7) return <span className="text-amber-600 text-xs font-semibold">Vence em {dias}d ⚠️</span>;
  return <span className="text-gray-500 text-xs">Vence em {dias}d</span>;
}

// ── Componente principal ──────────────────────────────────────
export function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('true');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        page: String(paginaAtual),
        limit: '20',
        ...(busca && { busca }),
        ...(filtroStatus && { status: filtroStatus }),
        ...(filtroAtivo && { ativo: filtroAtivo }),
      });
      const { data } = await api.get(`/alunos?${params}`);
      setAlunos(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }, [paginaAtual, busca, filtroStatus, filtroAtivo]);

  useEffect(() => {
    const debounce = setTimeout(carregar, 350);
    return () => clearTimeout(debounce);
  }, [carregar]);

  const abrirModal = (aluno?: Aluno) => {
    setAlunoSelecionado(aluno || null);
    setModalAberto(true);
  };

  const formatarCPF = (cpf: string) =>
    cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alunos</h1>
          <p className="text-gray-500 text-sm">{meta.total} alunos encontrados</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} />
          Novo Aluno
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou e-mail..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition"
            />
          </div>

          {/* Filtro Status Financeiro */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPaginaAtual(1); }}
              className="border border-gray-200 rounded-xl text-sm px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
            >
              <option value="">Todos os status</option>
              <option value="EM_DIA">Em dia</option>
              <option value="PENDENTE">Pendente</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="SEM_MATRICULA">Sem matrícula</option>
            </select>
          </div>

          {/* Filtro Ativo */}
          <select
            value={filtroAtivo}
            onChange={(e) => { setFiltroAtivo(e.target.value); setPaginaAtual(1); }}
            className="border border-gray-200 rounded-xl text-sm px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
          >
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
            <option value="">Todos</option>
          </select>

          <button
            onClick={carregar}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={16} className={`text-gray-500 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Aluno', 'CPF', 'Contato', 'Plano', 'Vencimento', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {carregando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : alunos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400">
                    <UserX size={40} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhum aluno encontrado.</p>
                  </td>
                </tr>
              ) : (
                alunos.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className={`hover:bg-gray-50/50 transition-colors ${
                      aluno.statusFinanceiro === 'ATRASADO' ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {aluno.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{aluno.nome}</p>
                          {!aluno.ativo && (
                            <span className="text-xs text-red-500 font-medium">Inativo</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 font-mono">
                      {formatarCPF(aluno.cpf)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-gray-600">{aluno.email || '—'}</div>
                      <div className="text-xs text-gray-400">{aluno.telefone || ''}</div>
                    </td>
                    <td className="px-5 py-4">
                      {aluno.matriculaAtiva ? (
                        <span className="text-sm font-medium text-gray-700">
                          {aluno.matriculaAtiva.plano.nome}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {aluno.matriculaAtiva ? (
                        <DiasVencer dias={aluno.matriculaAtiva.diasParaVencer} />
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={aluno.statusFinanceiro} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModal(aluno)}
                          className="text-xs text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          Ver
                        </button>
                        {aluno.statusFinanceiro === 'ATRASADO' && (
                          <button className="text-xs text-white bg-red-600 hover:bg-red-700 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                            Cobrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {meta.page} de {meta.totalPages} · {meta.total} registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>

              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setPaginaAtual(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      paginaAtual === page
                        ? 'bg-red-600 text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setPaginaAtual((p) => Math.min(meta.totalPages, p + 1))}
                disabled={paginaAtual === meta.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAberto && (
        <ModalAluno
          aluno={alunoSelecionado}
          onClose={() => setModalAberto(false)}
          onSalvo={() => { setModalAberto(false); carregar(); }}
        />
      )}
    </div>
  );
}
