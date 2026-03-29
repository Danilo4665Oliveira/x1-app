// =============================================================
// frontend/src/pages/Financeiro.tsx
// Histórico de pagamentos + confirmação + lista de inadimplentes
// =============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  CheckCircle2, AlertCircle, Clock, Search,
  ChevronLeft, ChevronRight, RefreshCw, Download
} from 'lucide-react';

type StatusPagamento = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';

interface Pagamento {
  id: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusPagamento;
  referenciaMes: string;
  metodoPagamento?: string;
  matricula: {
    aluno: { id: string; nome: string; cpf: string };
    plano: { nome: string };
  };
}

interface Inadimplente {
  pagamentoId: string;
  aluno: { id: string; nome: string; cpf: string; telefone?: string; email?: string };
  plano: { nome: string };
  valor: number;
  dataVencimento: string;
  diasEmAtraso: number;
  matriculaId: string;
}

interface Meta {
  totalInadimplentes: number;
  valorTotal: string;
}

// ── Badge de status de pagamento ──────────────────────────────
function StatusBadge({ status }: { status: StatusPagamento }) {
  const map: Record<StatusPagamento, { label: string; cls: string; icon: React.ReactNode }> = {
    PAGO: { label: 'Pago', cls: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={11} /> },
    PENDENTE: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={11} /> },
    ATRASADO: { label: 'Atrasado', cls: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle size={11} /> },
    CANCELADO: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: null },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {icon} {label}
    </span>
  );
}

// ── Modal de confirmação de pagamento ─────────────────────────
function ModalConfirmar({
  pagamentoId,
  nomAluno,
  valor,
  onClose,
  onConfirmado,
}: {
  pagamentoId: string;
  nomAluno: string;
  valor: number;
  onClose: () => void;
  onConfirmado: () => void;
}) {
  const [form, setForm] = useState({
    dataPagamento: new Date().toISOString().split('T')[0],
    metodoPagamento: 'PIX' as string,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const confirmar = async () => {
    setSalvando(true);
    try {
      await api.patch(`/pagamentos/${pagamentoId}/confirmar`, form);
      onConfirmado();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao confirmar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Confirmar Pagamento</h3>
        <p className="text-sm text-gray-500 mb-5">
          Aluno: <strong>{nomAluno}</strong> · Valor:{' '}
          <strong className="text-green-600">
            R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </strong>
        </p>

        {erro && <p className="text-xs text-red-600 mb-4">{erro}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Data do Pagamento
            </label>
            <input
              type="date"
              value={form.dataPagamento}
              onChange={(e) => setForm((f) => ({ ...f, dataPagamento: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Método
            </label>
            <select
              value={form.metodoPagamento}
              onChange={(e) => setForm((f) => ({ ...f, metodoPagamento: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            >
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={salvando}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {salvando ? 'Confirmando...' : '✓ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
type Aba = 'historico' | 'inadimplentes';

export function Financeiro() {
  const [aba, setAba] = useState<Aba>('inadimplentes');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([]);
  const [metaInad, setMetaInad] = useState<Meta>({ totalInadimplentes: 0, valorTotal: '0' });
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [modalConfirmar, setModalConfirmar] = useState<{
    pagamentoId: string; nomAluno: string; valor: number
  } | null>(null);

  const carregarInadimplentes = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/pagamentos/inadimplentes');
      setInadimplentes(data.data);
      setMetaInad({ totalInadimplentes: data.meta.totalAlunos, valorTotal: data.meta.valorTotal });
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarHistorico = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        page: String(paginaAtual),
        limit: '20',
        ...(busca && { busca }),
        ...(filtroStatus && { status: filtroStatus }),
      });
      const { data } = await api.get(`/pagamentos/historico?${params}`);
      setPagamentos(data.data ?? []);
      setTotalPaginas(data.meta?.totalPages ?? 1);
    } finally {
      setCarregando(false);
    }
  }, [paginaAtual, busca, filtroStatus]);

  useEffect(() => {
    if (aba === 'inadimplentes') carregarInadimplentes();
    else carregarHistorico();
  }, [aba, carregarInadimplentes, carregarHistorico]);

  const formatarData = (data?: string) => {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor: number) =>
    `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const formatarCPF = (cpf: string) =>
    cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 text-sm">Gestão de pagamentos e mensalidades</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([
          { id: 'inadimplentes', label: 'Inadimplentes' },
          { id: 'historico', label: 'Histórico' },
        ] as { id: Aba; label: string }[]).map((a) => (
          <button
            key={a.id}
            onClick={() => { setAba(a.id); setPaginaAtual(1); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              aba === a.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {a.label}
            {a.id === 'inadimplentes' && metaInad.totalInadimplentes > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {metaInad.totalInadimplentes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ABA: INADIMPLENTES ── */}
      {aba === 'inadimplentes' && (
        <>
          {/* Resumo */}
          {metaInad.totalInadimplentes > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Alunos em atraso</p>
                <p className="text-3xl font-bold text-red-700">{metaInad.totalInadimplentes}</p>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Total a receber</p>
                <p className="text-3xl font-bold text-red-700">
                  R$ {Number(metaInad.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* Tabela inadimplentes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Pagamentos em atraso</h2>
              <button onClick={carregarInadimplentes} className="p-1.5 hover:bg-gray-50 rounded-lg">
                <RefreshCw size={14} className={`text-gray-400 ${carregando ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Aluno', 'Plano', 'Referência', 'Vencimento', 'Dias em atraso', 'Valor', 'Ação'].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {carregando ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : inadimplentes.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      <CheckCircle2 size={36} className="mx-auto mb-2 text-green-300" />
                      Nenhum aluno inadimplente. Ótimo!
                    </td></tr>
                  ) : (
                    inadimplentes.map((item) => (
                      <tr key={item.pagamentoId} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-900 text-sm">{item.aluno.nome}</p>
                          <p className="text-xs text-gray-400 font-mono">{formatarCPF(item.aluno.cpf)}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">{item.plano.nome}</td>
                        <td className="px-5 py-3 text-sm font-mono text-gray-500">{item.diasEmAtraso === undefined ? '—' : ''}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{formatarData(item.dataVencimento)}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                            ▲ {item.diasEmAtraso} {item.diasEmAtraso === 1 ? 'dia' : 'dias'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-red-600">
                          {formatarMoeda(item.valor)}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setModalConfirmar({
                              pagamentoId: item.pagamentoId,
                              nomAluno: item.aluno.nome,
                              valor: item.valor,
                            })}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            ✓ Confirmar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── ABA: HISTÓRICO ── */}
      {aba === 'historico' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Filtros */}
          <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar aluno..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPaginaAtual(1); }}
              className="border border-gray-200 rounded-xl text-sm px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
            >
              <option value="">Todos</option>
              <option value="PAGO">Pago</option>
              <option value="PENDENTE">Pendente</option>
              <option value="ATRASADO">Atrasado</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Aluno', 'Plano', 'Referência', 'Vencimento', 'Pagamento', 'Método', 'Valor', 'Status', 'Ação'].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {carregando ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : pagamentos.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400">Nenhum pagamento encontrado.</td></tr>
                ) : (
                  pagamentos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-sm text-gray-900">{p.matricula.aluno.nome}</p>
                        <p className="text-xs text-gray-400 font-mono">{formatarCPF(p.matricula.aluno.cpf)}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{p.matricula.plano.nome}</td>
                      <td className="px-5 py-3 text-sm font-mono text-gray-500">{p.referenciaMes}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatarData(p.dataVencimento)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatarData(p.dataPagamento)}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{p.metodoPagamento?.replace('_', ' ') || '—'}</td>
                      <td className="px-5 py-3 font-semibold text-sm text-gray-800">{formatarMoeda(p.valor)}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3">
                        {(p.status === 'PENDENTE' || p.status === 'ATRASADO') && (
                          <button
                            onClick={() => setModalConfirmar({
                              pagamentoId: p.id,
                              nomAluno: p.matricula.aluno.nome,
                              valor: p.valor,
                            })}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            ✓ Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="px-5 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">Página {paginaAtual} de {totalPaginas}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar pagamento */}
      {modalConfirmar && (
        <ModalConfirmar
          {...modalConfirmar}
          onClose={() => setModalConfirmar(null)}
          onConfirmado={() => {
            setModalConfirmar(null);
            if (aba === 'inadimplentes') carregarInadimplentes();
            else carregarHistorico();
          }}
        />
      )}
    </div>
  );
}
