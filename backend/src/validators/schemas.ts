// =============================================================
// validators/schemas.ts — Validação com Zod (camada de entrada)
// Garante que nenhum dado malformado chega ao Prisma/DB
// =============================================================
import { z } from 'zod';

// ── Utilitários ──────────────────────────────────────────────

/**
 * Valida CPF brasileiro (algoritmo oficial dos dígitos verificadores)
 * Protege contra CPFs inválidos como "111.111.111-11"
 */
function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return false;
  if (/^(\d)\1+$/.test(limpo)) return false; // todos dígitos iguais

  const calcDigito = (base: string, tamanho: number): number => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += parseInt(base[i]) * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 || resto === 11 ? 0 : resto;
  };

  const d1 = calcDigito(limpo, 9);
  const d2 = calcDigito(limpo, 10);

  return (
    d1 === parseInt(limpo[9]) &&
    d2 === parseInt(limpo[10])
  );
}

// ── Auth ─────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres.'),
});

export const cadastroAdminSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres.').max(100),
  email: z.string().email('E-mail inválido.'),
  senha: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres.')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula.')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número.'),
});

// ── Aluno ─────────────────────────────────────────────────────

export const criarAlunoSchema = z.object({
  nome: z.string().min(3, 'Nome inválido.').max(150),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, '')) // remove máscara
    .refine(validarCPF, 'CPF inválido.'),
  email: z.string().email('E-mail inválido.').optional().nullable(),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone inválido (somente números, 10 ou 11 dígitos).')
    .optional()
    .nullable(),
  dataNasc: z.coerce.date().optional().nullable(),
  endereco: z.string().max(300).optional().nullable(),
  foto: z.string().url('URL da foto inválida.').optional().nullable(),
});

export const atualizarAlunoSchema = criarAlunoSchema.partial();

// ── Plano ─────────────────────────────────────────────────────

export const criarPlanoSchema = z.object({
  nome: z.string().min(2).max(100),
  descricao: z.string().max(500).optional().nullable(),
  valorMensal: z.number().positive('Valor mensal deve ser positivo.'),
  valorTotal: z.number().positive('Valor total deve ser positivo.'),
  duracaoDias: z
    .number()
    .int()
    .min(1, 'Duração mínima é 1 dia.')
    .max(730, 'Duração máxima é 730 dias.'),
});

export const atualizarPlanoSchema = criarPlanoSchema.partial();

// ── Matrícula ─────────────────────────────────────────────────

export const criarMatriculaSchema = z.object({
  alunoId: z.string().uuid('ID do aluno inválido.'),
  planoId: z.string().uuid('ID do plano inválido.'),
  dataInicio: z.coerce.date(),
  observacoes: z.string().max(500).optional().nullable(),
});

// ── Pagamento ─────────────────────────────────────────────────

export const registrarPagamentoSchema = z.object({
  matriculaId: z.string().uuid(),
  valor: z.number().positive('Valor do pagamento deve ser positivo.'),
  dataVencimento: z.coerce.date(),
  dataPagamento: z.coerce.date().optional().nullable(),
  referenciaMes: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'referenciaMes deve estar no formato AAAA-MM.'),
  metodoPagamento: z
    .enum(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'BOLETO'])
    .optional()
    .nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export const confirmarPagamentoSchema = z.object({
  dataPagamento: z.coerce.date(),
  metodoPagamento: z.enum([
    'PIX',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'DINHEIRO',
    'BOLETO',
  ]),
});

// Tipos TypeScript derivados dos schemas (DRY)
export type LoginInput = z.infer<typeof loginSchema>;
export type CriarAlunoInput = z.infer<typeof criarAlunoSchema>;
export type AtualizarAlunoInput = z.infer<typeof atualizarAlunoSchema>;
export type CriarPlanoInput = z.infer<typeof criarPlanoSchema>;
export type CriarMatriculaInput = z.infer<typeof criarMatriculaSchema>;
export type RegistrarPagamentoInput = z.infer<typeof registrarPagamentoSchema>;
export type ConfirmarPagamentoInput = z.infer<typeof confirmarPagamentoSchema>;
