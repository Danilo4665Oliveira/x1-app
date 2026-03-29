// =============================================================
// frontend/src/pages/Planos.tsx
// CRUD de planos (Mensal, Trimestral, Anual, etc.)
// =============================================================
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Plus, Pencil, Trash2, X, Save, Loader2,
  Clock, DollarSign, CheckCircle
} from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  descricao?: string;
  valorMensal: number;
  valorTotal: number;
  duracaoDias: number;
  ativo: boolean;
}

const PLANO_VAZIO: Omit<Plano, 'id' | 'ativo'> = {
  nome: '',
  descricao: '',
  valorMensal: 0,
  valorTotal: 0,
  duracaoDias: 30,
};

// ── Ícone de cor por duração ──────────────────────────────────
function corPlano(dias: number) {
  if (dias <= 30) return 'bg-blue-50 border-blue-200 text-blue-700';
  if (dias <= 90) return 'bg-purple-50 border-purple-200 text-purple-700';
  return 'bg-amber-50 border-amber-200 text-amber-700';
}

function labelDuracao(dias: number) {
  if (dias === 30) return 'Mensal';
  if (dias === 90) return 'Trimestral';
  if (dias === 180) return 'Semestral';
  if (dias === 365) return 'Anual';
  return `${dias} dias`;
}

// ── Modal de criação/edição ───────────────────────────────────
interface ModalProps {
  plano: Plano | null;
  onClose: () => void;
  onSalvo: () => void;
}

function ModalPlano({ plano, onClose, onSalvo }: ModalProps) {
  const [form, setForm] = useState(
    plano
      ? {
          nome: plano.nome,
          descricao: plano.descricao ?? '',
          valorMensal: plano.valorMensal,
          valorTotal: plano.valorTotal,
          duracaoDias: plano.duracaoDias,
        }
      : { ...PLANO_VAZIO }
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const atualizar = (campo: string, valor: string | number) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: '' }));
  };

  // Calcula valor total automaticamente ao trocar duração ou valorMensal
  const calcularTotal = (mensal: number, dias: number) => {
    const meses = dias / 30;
    return parseFloat((mensal * meses).toFixed(2));
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome obrigatório.';
    if (form.valorMensal <= 0) e.valorMensal = 'Valor mensal deve ser positivo.';
    if (form.valorTotal <= 0) e.valorTotal = 'Valor total deve ser positivo.';
    if (form.duracaoDias < 1) e.duracaoDias = 'Duração mínima: 1 dia.';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      if (plano?.id) {
        await api.patch(`/planos/${plano.id}`, form);
      } else {
        await api.post('/planos', form);
      }
      onSalvo();
    } catch (err: any) {
      setErros({ geral: err.response?.data?.error || 'Erro ao salvar.' });
    } finally {
      setSalvando(false);
    }
  };

  const Field = ({
    label, campo, tipo = 'text', placeholder = ''
  }: { label: string; campo: string; tipo?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type={tipo}
        value={(form as any)[campo]}
        placeholder={placeholder}
        onChange={(e) =>
          atualizar(campo, tipo === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
        }
        className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 ${
          erros[campo] ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-red-400'
        }`}
      />
      {erros[campo] && <p className="text-xs text-red-600 mt-1">{erros[campo]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {plano?.id ? 'Editar Plano' : 'Novo Plano'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {erros.geral && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{erros.geral}</div>
          )}

          <Field label="Nome do Plano *" campo="nome" placeholder="Ex: Mensal, Trimestral, Anual" />
          <Field label="Descrição" campo="descricao" placeholder="Descreva os benefícios do plano" />

          {/* Duração */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Duração
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Mensal', dias: 30 },
                { label: 'Trimestral', dias: 90 },
                { label: 'Semestral', dias: 180 },
                { label: 'Anual', dias: 365 },
              ].map((op) => (
                <button
                  key={op.dias}
                  type="button"
                  onClick={() => {
                    atualizar('duracaoDias', op.dias);
                    atualizar('valorTotal', calcularTotal(form.valorMensal, op.dias));
                  }}
                  className={`py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                    form.duracaoDias === op.dias
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={form.duracaoDias}
              onChange={(e) => {
                const d = parseInt(e.target.value) || 1;
                atualizar('duracaoDias', d);
                atualizar('valorTotal', calcularTotal(form.valorMensal, d));
              }}
              className="mt-2 w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              placeholder="Ou digite os dias manualmente"
            />
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Valor Mensal (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valorMensal || ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  atualizar('valorMensal', v);
                  atualizar('valorTotal', calcularTotal(v, form.duracaoDias));
                }}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 ${
                  erros.valorMensal ? 'border-red-400' : 'border-gray-200 focus:border-red-400'
                }`}
                placeholder="89,90"
              />
              {erros.valorMensal && <p className="text-xs text-red-600 mt-1">{erros.valorMensal}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valorTotal || ''}
                onChange={(e) => atualizar('valorTotal', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                placeholder="239,90"
              />
            </div>
          </div>

          {/* Preview */}
          {form.nome && form.valorTotal > 0 && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
              <p className="font-semibold text-gray-700 mb-1">Prévia do plano:</p>
              <p className="text-gray-500">
                <strong className="text-gray-800">{form.nome}</strong> · {labelDuracao(form.duracaoDias)} ·{' '}
                <strong className="text-red-600">
                  R$ {form.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {plano?.id ? 'Salvar alterações' : 'Criar plano'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────
export function Planos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState<{ aberto: boolean; plano: Plano | null }>({
    aberto: false,
    plano: null,
  });

  const carregar = async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/planos');
      setPlanos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const deletar = async (id: string, nome: string) => {
    if (!confirm(`Desativar o plano "${nome}"? Matrículas existentes não são afetadas.`)) return;
    await api.delete(`/planos/${id}`);
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
          <p className="text-gray-500 text-sm">{planos.length} planos cadastrados</p>
        </div>
        <button
          onClick={() => setModal({ aberto: true, plano: null })}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} />
          Novo Plano
        </button>
      </div>

      {/* Cards de planos */}
      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : planos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <DollarSign size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">Nenhum plano cadastrado ainda.</p>
          <button
            onClick={() => setModal({ aberto: true, plano: null })}
            className="mt-4 text-sm text-red-600 font-semibold hover:underline"
          >
            Criar o primeiro plano →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className={`bg-white rounded-2xl border-2 p-6 shadow-sm hover:shadow-md transition-all relative group`}
            >
              {/* Badge de tipo */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border mb-4 ${corPlano(plano.duracaoDias)}`}
              >
                <Clock size={11} />
                {labelDuracao(plano.duracaoDias)}
              </span>

              <h3 className="text-lg font-bold text-gray-900 mb-1">{plano.nome}</h3>
              {plano.descricao && (
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{plano.descricao}</p>
              )}

              {/* Valores */}
              <div className="space-y-1.5 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Valor total</span>
                  <span className="text-xl font-bold text-gray-900">
                    R$ {Number(plano.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Mensalidade</span>
                  <span className="text-sm font-medium text-gray-600">
                    R$ {Number(plano.valorMensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-green-600 font-medium mb-5">
                <CheckCircle size={13} />
                {plano.ativo ? 'Plano ativo' : 'Desativado'}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setModal({ aberto: true, plano })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={() => deletar(plano.id, plano.nome)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} />
                  Desativar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.aberto && (
        <ModalPlano
          plano={modal.plano}
          onClose={() => setModal({ aberto: false, plano: null })}
          onSalvo={() => { setModal({ aberto: false, plano: null }); carregar(); }}
        />
      )}
    </div>
  );
}
