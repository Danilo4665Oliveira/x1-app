// =============================================================
// controllers/authController.ts
// =============================================================
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import type { LoginInput, CadastroAdminInput } from '../validators/schemas';

const SALT_ROUNDS = 12; // custo de hashing bcrypt

export const authController = {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body as LoginInput;

    // Busca usuário — mesmo tempo de resposta se não existir (timing attack)
    const user = await prisma.user.findUnique({ where: { email } });

    // Compara hash mesmo que user não exista (evita timing attack)
    const senhaValida = user
      ? await bcrypt.compare(senha, user.senha)
      : await bcrypt.compare(senha, '$2b$12$invalidsaltinvalidhash000000');

    if (!user || !senhaValida || !user.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '8h' }
    );

    // Não retorna a senha no response
    const { senha: _, ...userSemSenha } = user;

    res.json({ token, user: userSemSenha });
  },

  async cadastrar(req: Request, res: Response) {
    const { nome, email, senha } = req.body;

    const hash = await bcrypt.hash(senha, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { nome, email, senha: hash },
      select: { id: true, nome: true, email: true, role: true, criadoEm: true },
    });

    res.status(201).json(user);
  },

  async me(req: Request, res: Response) {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, nome: true, email: true, role: true },
    });
    res.json(user);
  },
};

// =============================================================
// controllers/alunoController.ts
// =============================================================
import { prisma } from '../lib/prisma';
import type { CriarAlunoInput, AtualizarAlunoInput } from '../validators/schemas';

export const alunoController = {

  // ── Listar com filtros, busca e paginação ──────────────────
  async listar(req: Request, res: Response) {
    const {
      page = '1',
      limit = '20',
      busca = '',
      ativo,
      status, // 'EM_DIA' | 'PENDENTE' | 'ATRASADO'
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      adminId: req.user!.userId,
      ...(ativo !== undefined && { ativo: ativo === 'true' }),
      ...(busca && {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' } },
          { cpf: { contains: busca } },
          { email: { contains: busca, mode: 'insensitive' } },
        ],
      }),
    };

    const [alunos, total] = await Promise.all([
      prisma.aluno.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { nome: 'asc' },
        include: {
          matriculas: {
            where: { status: 'ATIVA' },
            orderBy: { criadoEm: 'desc' },
            take: 1,
            include: {
              plano: { select: { nome: true } },
              pagamentos: {
                orderBy: { dataVencimento: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.aluno.count({ where }),
    ]);

    // Enriquece cada aluno com dados calculados de status financeiro
    const alunosEnriquecidos = alunos.map((aluno) => {
      const matriculaAtiva = aluno.matriculas[0];
      const ultimoPagamento = matriculaAtiva?.pagamentos[0];

      const hoje = new Date();
      let statusFinanceiro: 'EM_DIA' | 'PENDENTE' | 'ATRASADO' | 'SEM_MATRICULA' =
        'SEM_MATRICULA';
      let diasParaVencer: number | null = null;

      if (matriculaAtiva) {
        const diffMs = matriculaAtiva.dataFim.getTime() - hoje.getTime();
        diasParaVencer = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (ultimoPagamento) {
          if (ultimoPagamento.status === 'PAGO') {
            statusFinanceiro = 'EM_DIA';
          } else if (
            ultimoPagamento.status === 'PENDENTE' &&
            ultimoPagamento.dataVencimento >= hoje
          ) {
            statusFinanceiro = 'PENDENTE';
          } else {
            statusFinanceiro = 'ATRASADO';
          }
        }
      }

      return {
        ...aluno,
        matriculaAtiva: matriculaAtiva
          ? {
              id: matriculaAtiva.id,
              dataFim: matriculaAtiva.dataFim,
              plano: matriculaAtiva.plano,
              diasParaVencer,
            }
          : null,
        statusFinanceiro,
      };
    });

    // Filtra por status financeiro se solicitado (pós-query)
    const resultado = status
      ? alunosEnriquecidos.filter((a) => a.statusFinanceiro === status)
      : alunosEnriquecidos;

    res.json({
      data: resultado,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  },

  // ── Buscar um aluno por ID ─────────────────────────────────
  async buscarPorId(req: Request, res: Response) {
    const { id } = req.params;

    const aluno = await prisma.aluno.findFirst({
      where: { id, adminId: req.user!.userId },
      include: {
        matriculas: {
          include: {
            plano: true,
            pagamentos: { orderBy: { dataVencimento: 'desc' } },
          },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });

    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    res.json(aluno);
  },

  // ── Criar aluno ────────────────────────────────────────────
  async criar(req: Request, res: Response) {
    const dados = req.body as CriarAlunoInput;

    const aluno = await prisma.aluno.create({
      data: { ...dados, adminId: req.user!.userId },
    });

    res.status(201).json(aluno);
  },

  // ── Atualizar aluno ────────────────────────────────────────
  async atualizar(req: Request, res: Response) {
    const { id } = req.params;
    const dados = req.body as AtualizarAlunoInput;

    // Verifica posse do registro antes de atualizar
    const aluno = await prisma.aluno.findFirst({
      where: { id, adminId: req.user!.userId },
    });
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    const atualizado = await prisma.aluno.update({
      where: { id },
      data: dados,
    });

    res.json(atualizado);
  },

  // ── Ativar/Desativar (soft delete) ────────────────────────
  async toggleAtivo(req: Request, res: Response) {
    const { id } = req.params;

    const aluno = await prisma.aluno.findFirst({
      where: { id, adminId: req.user!.userId },
    });
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    const atualizado = await prisma.aluno.update({
      where: { id },
      data: { ativo: !aluno.ativo },
      select: { id: true, nome: true, ativo: true },
    });

    res.json(atualizado);
  },
};
