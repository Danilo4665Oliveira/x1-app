import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface Aluno {
  id?: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  dataNasc?: string;
  endereco?: string;
}

interface Props {
  aluno: Aluno | null;
  onClose: () => void;
  onSalvo: () => void;
}

function formatarCPF(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatarTelefone(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\(\d{2}\) \d{5})(\d)/, '$1-$2');
}

export function ModalAluno({ aluno, onClose, onSalvo }: Props) {
  const [form, setForm] = useState({
    nome: aluno?.nome ?? '',
    cpf: aluno ? formatarCPF(aluno.cpf) : '',
    email: aluno?.email ?? '',
    telefone: aluno?.telefone ? formatarTelefone(aluno.telefone) : '',
    dataNasc: aluno?.dataNasc?.split('T')[0] ?? '',
    endereco: aluno?.endereco ?? '',
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const atualizar = (campo: string, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: '' }));
  };

  const validar = (): boolean => {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim() || form.nome.length < 3)
      novosErros.nome = 'Nome deve ter ao menos 3 caracteres.';
    const cpfLimpo = form.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11)
      novosErros.cpf = 'CPF deve ter 11 dígitos.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      novosErros.email = 'E-mail inválido.';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const payload = {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone.replace(/\D/g, '') || null,
        dataNasc: form.dataNasc || null,
      };
      if (aluno?.id) {
        await api.patch(`/alunos/${aluno.id}`, payload);
      } else {
        await api.post('/alunos', payload);
      }
      onSalvo();
    } catch (err: any) {
      setErros({ geral: err.response?.data?.error || 'Erro ao salvar aluno.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {aluno?.id ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {erros.geral && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {erros.geral}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Nome Completo *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => atualizar('nome', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 ${erros.nome ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-red-400'}`}
              placeholder="João Silva"
            />
            {erros.nome && <p className="text-xs text-red-600 mt-1">{erros.nome}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">CPF *</label>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => atualizar('cpf', formatarCPF(e.target.value))}
              disabled={!!aluno?.id}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition font-mono focus:ring-2 focus:ring-red-500/20 ${erros.cpf ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-red-400'} ${aluno?.id ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="000.000.000-00"
            />
            {erros.cpf && <p className="text-xs text-red-600 mt-1">{erros.cpf}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => atualizar('email', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 ${erros.email ? 'border-red-400' : 'border-gray-200 focus:border-red-400'}`}
                placeholder="joao@email.com"
              />
              {erros.email && <p className="text-xs text-red-600 mt-1">{erros.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => atualizar('telefone', formatarTelefone(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                placeholder="(81) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Data de Nascimento</label>
            <input
              type="date"
              value={form.dataNasc}
              onChange={(e) => atualizar('dataNasc', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Endereço</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => atualizar('endereco', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              placeholder="Rua, número, bairro, cidade"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {aluno?.id ? 'Salvar alterações' : 'Cadastrar aluno'}
          </button>
        </div>
      </div>
    </div>
  );
}
