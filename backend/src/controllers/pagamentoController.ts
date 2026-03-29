// =============================================================
// controllers/pagamentoController.ts
// Inclui a QUERY DE INADIMPLÊNCIA com explicação detalhada
// =============================================================
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type {
  RegistrarPagamentoInput,
  ConfirmarPagamentoInput,
} from '../validators/schemas';

export const pagamentoController = {

  // ── Registrar nova cobrança ────────────────────────────────
  async registrar(req: Request, res: Response) {
    const dados = req.body as RegistrarPagamentoInput;

    // Verifica se a matrícula pertence a um aluno do admin logado
    const matricula = await prisma.matricula.findFirst({
      where: {
        id: dados.matriculaId,
        aluno: { adminId: req.user!.userId },
      },
    });
    if (!matricula) {
      return res.status(404).json({ error: 'Matrícula não encontrada.' });
    }

    // Impede duplicidade de cobrança para o mesmo mês/matrícula
    const cobrancaExistente = await prisma.pagamento.findFirst({
      where: {
        matriculaId: dados.matriculaId,
        referenciaMes: dados.referenciaMes,
      },
    });
    if (cobrancaExistente) {
      return res.status(409).json({
        error: `Já existe uma cobrança para ${dados.referenciaMes} nesta matrícula.`,
      });
    }

    const pagamento = await prisma.pagamento.create({
      data: {
        ...dados,
        status: dados.dataPagamento ? 'PAGO' : 'PENDENTE',
      },
    });

    res.status(201).json(pagamento);
  },

  // ── Confirmar pagamento de uma cobrança ───────────────────
  async confirmar(req: Request, res: Response) {
    const { id } = req.params;
    const { dataPagamento, metodoPagamento } = req.body as ConfirmarPagamentoInput;

    const pagamento = await prisma.pagamento.findFirst({
      where: {
        id,
        matricula: { aluno: { adminId: req.user!.userId } },
      },
    });
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado.' });
    }
    if (pagamento.status === 'PAGO') {
      return res.status(400).json({ error: 'Pagamento já foi confirmado.' });
    }

    const atualizado = await prisma.pagamento.update({
      where: { id },
      data: { dataPagamento, metodoPagamento, status: 'PAGO' },
    });

    res.json(atualizado);
  },

  // ── Histórico de pagamentos de uma matrícula ──────────────
  async historico(req: Request, res: Response) {
    const { matriculaId } = req.params;

    const pagamentos = await prisma.pagamento.findMany({
      where: {
        matriculaId,
        matricula: { aluno: { adminId: req.user!.userId } },
      },
      orderBy: { dataVencimento: 'desc' },
    });

    res.json(pagamentos);
  },

  // ====================================================================
  // QUERY DE INADIMPLÊNCIA — Documentação Acadêmica
  // ====================================================================
  //
  // OBJETIVO:
  //   Identificar todos os alunos com pagamentos ATRASADOS ou que ainda
  //   estão PENDENTES mas cujo vencimento já passou (status desatualizado).
  //
  // LÓGICA DE NEGÓCIO:
  //   Um aluno é inadimplente quando:
  //   1. Possui pagamento com status='ATRASADO', OU
  //   2. Possui pagamento com status='PENDENTE' mas dataVencimento < hoje
  //      (significa que o prazo passou sem pagamento — caso de dados antigos)
  //
  // DECISÃO TÉCNICA — Por que usar RAW SQL aqui?
  //   O Prisma não suporta nativamente "UPDATE WHERE" em lote com lógica
  //   condicional complexa. Para a query de inadimplência usamos Prisma
  //   com filtros compostos (OR/AND), evitando qualquer raw SQL e mantendo
  //   a proteção contra SQL Injection do ORM.
  //
  // ÍNDICES UTILIZADOS (ver schema.prisma):
  //   - pagamentos.status         → filtra PENDENTE/ATRASADO
  //   - pagamentos.dataVencimento → compara com a data atual
  //   - matriculas.status         → descarta matrículas canceladas
  //
  // COMPLEXIDADE:
  //   A query faz JOINs: Pagamento → Matricula → Aluno
  //   O Prisma traduz isso em um único SELECT com subconsultas otimizadas,
  //   evitando o problema N+1 (buscar cada aluno individualmente).
  //
  // ====================================================================
  async inadimplentes(req: Request, res: Response) {
    const hoje = new Date();

    // PASSO 1 — Sincroniza o status de pagamentos vencidos
    // (transação atômica: garante consistência mesmo em falhas)
    await prisma.$transaction([
      prisma.pagamento.updateMany({
        where: {
          status: 'PENDENTE',
          dataVencimento: { lt: hoje }, // lt = less than (menor que hoje)
          matricula: {
            status: 'ATIVA',
            aluno: { adminId: req.user!.userId },
          },
        },
        data: { status: 'ATRASADO' },
      }),
    ]);

    // PASSO 2 — Busca os inadimplentes com dados agregados
    //
    // Decomposição da query:
    //
    //  pagamentos WHERE:
    //  ┌─────────────────────────────────────────────────────────┐
    //  │ status = 'ATRASADO'                                     │
    //  │   AND matricula.status = 'ATIVA'                        │
    //  │   AND matricula.aluno.adminId = <id do admin logado>    │
    //  └─────────────────────────────────────────────────────────┘
    //
    //  Para cada pagamento, inclui (JOIN):
    //    → matricula (id, dataFim)
    //      → plano (nome)
    //      → aluno (id, nome, cpf, email, telefone)
    //
    //  Ordena por dataVencimento ASC (mais vencido primeiro)
    //
    const inadimplentes = await prisma.pagamento.findMany({
      where: {
        status: 'ATRASADO',
        matricula: {
          status: 'ATIVA',
          aluno: { adminId: req.user!.userId, ativo: true },
        },
      },
      orderBy: { dataVencimento: 'asc' }, // mais urgente primeiro
      include: {
        matricula: {
          include: {
            plano: { select: { nome: true, valorTotal: true } },
            aluno: {
              select: { id: true, nome: true, cpf: true, email: true, telefone: true },
            },
          },
        },
      },
    });

    // PASSO 3 — Calcula métricas derivadas para o frontend
    //
    // diasEmAtraso: diferença entre hoje e o vencimento (dias inteiros)
    // Exemplo: venceu em 10/06, hoje é 25/06 → 15 dias em atraso
    //
    const resultado = inadimplentes.map((p) => {
      const diffMs = hoje.getTime() - p.dataVencimento.getTime();
      const diasEmAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        pagamentoId: p.id,
        referenciaMes: p.referenciaMes,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        diasEmAtraso,
        aluno: p.matricula.aluno,
        plano: p.matricula.plano,
        matriculaId: p.matriculaId,
      };
    });

    // PASSO 4 — Sumário para os cards do Dashboard
    const totalInadimplente = resultado.reduce(
      (acc, p) => acc + Number(p.valor),
      0
    );

    res.json({
      data: resultado,
      meta: {
        totalAlunos: resultado.length,
        valorTotal: totalInadimplente.toFixed(2),
      },
    });
  },

  // ── Dashboard — métricas gerais ───────────────────────────
  async metricas(req: Request, res: Response) {
    const hoje = new Date();
    const adminId = req.user!.userId;

    // Executa todas as queries em paralelo com Promise.all
    // Reduz o tempo de resposta de (t1+t2+t3+t4) para max(t1,t2,t3,t4)
    const [
      totalAlunos,
      alunosAtivos,
      matriculasAtivas,
      pagamentosHoje,
      inadimplentesCount,
      vencendo7Dias,
      receitaMes,
    ] = await Promise.all([
      // 1. Total de alunos cadastrados
      prisma.aluno.count({ where: { adminId } }),

      // 2. Alunos com cadastro ativo
      prisma.aluno.count({ where: { adminId, ativo: true } }),

      // 3. Matrículas ativas (aluno pagando e dentro do prazo)
      prisma.matricula.count({
        where: { status: 'ATIVA', aluno: { adminId } },
      }),

      // 4. Pagamentos confirmados hoje
      prisma.pagamento.count({
        where: {
          status: 'PAGO',
          dataPagamento: {
            gte: new Date(hoje.setHours(0, 0, 0, 0)),
            lte: new Date(hoje.setHours(23, 59, 59, 999)),
          },
          matricula: { aluno: { adminId } },
        },
      }),

      // 5. Alunos inadimplentes
      prisma.pagamento.count({
        where: {
          status: 'ATRASADO',
          matricula: { status: 'ATIVA', aluno: { adminId } },
        },
      }),

      // 6. Matrículas vencendo nos próximos 7 dias
      prisma.matricula.count({
        where: {
          status: 'ATIVA',
          dataFim: {
            gte: hoje,
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          aluno: { adminId },
        },
      }),

      // 7. Receita do mês atual (soma de pagamentos pagos)
      prisma.pagamento.aggregate({
        where: {
          status: 'PAGO',
          referenciaMes: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`,
          matricula: { aluno: { adminId } },
        },
        _sum: { valor: true },
      }),
    ]);

    res.json({
      totalAlunos,
      alunosAtivos,
      matriculasAtivas,
      pagamentosHoje,
      inadimplentesCount,
      vencendo7Dias,
      receitaMes: receitaMes._sum.valor ?? 0,
    });
  },
};

// =============================================================
// controllers/planoController.ts
// =============================================================
export const planoController = {
  async listar(req: Request, res: Response) {
    const planos = await prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { duracaoDias: 'asc' },
    });
    res.json(planos);
  },

  async criar(req: Request, res: Response) {
    const plano = await prisma.plano.create({ data: req.body });
    res.status(201).json(plano);
  },

  async atualizar(req: Request, res: Response) {
    const plano = await prisma.plano.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(plano);
  },

  async deletar(req: Request, res: Response) {
    await prisma.plano.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });
    res.status(204).send();
  },
};

// =============================================================
// controllers/matriculaController.ts
// =============================================================
export const matriculaController = {
  async criar(req: Request, res: Response) {
    const { alunoId, planoId, dataInicio, observacoes } = req.body;

    const plano = await prisma.plano.findUnique({ where: { id: planoId } });
    if (!plano) return res.status(404).json({ error: 'Plano não encontrado.' });

    // Calcula dataFim automaticamente baseado na duração do plano
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + plano.duracaoDias);

    // Usa transação para garantir que matrícula e 1º pagamento são criados juntos
    const resultado = await prisma.$transaction(async (tx) => {
      // Cancela matrículas ativas anteriores do mesmo aluno
      await tx.matricula.updateMany({
        where: { alunoId, status: 'ATIVA' },
        data: { status: 'CANCELADA' },
      });

      const matricula = await tx.matricula.create({
        data: { alunoId, planoId, dataInicio, dataFim, observacoes },
        include: { plano: true, aluno: true },
      });

      // Gera automaticamente o 1º pagamento
      const mesReferencia = `${new Date(dataInicio).getFullYear()}-${String(new Date(dataInicio).getMonth() + 1).padStart(2, '0')}`;
      const pagamento = await tx.pagamento.create({
        data: {
          matriculaId: matricula.id,
          valor: plano.valorTotal,
          dataVencimento: new Date(dataInicio),
          referenciaMes: mesReferencia,
          status: 'PENDENTE',
        },
      });

      return { matricula, pagamento };
    });

    res.status(201).json(resultado);
  },
};
