// =============================================================
// frontend/src/pages/Login.tsx
// Tela de login — armazena JWT no localStorage após sucesso
// =============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Dumbbell, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/', { replace: true });
    } catch (err: any) {
      setErro(
        err.response?.data?.error || 'Erro ao conectar. Tente novamente.'
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600 rounded-2xl shadow-lg shadow-red-200 mb-4">
            <Dumbbell size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AcademiaOS</h1>
          <p className="text-gray-500 text-sm mt-1">Acesse sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Erro global */}
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
                {erro}
              </div>
            )}

            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                placeholder="admin@academia.com"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-red-200"
            >
              {carregando ? (
                <Loader2 size={17} className="animate-spin" />
              ) : null}
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          AcademiaOS © {new Date().getFullYear()} · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
