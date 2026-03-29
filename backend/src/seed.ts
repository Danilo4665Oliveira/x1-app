// =============================================================
// backend/src/seed.ts — Popula o banco com dados de exemplo
// Execute: npx ts-node src/seed.ts
// =============================================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── 1. Admin ──────────────────────────────────────────────
  const senhaHash = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@academia.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@academia.com',
      senha: senhaHash,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin criado: ${admin.email}`);

  // ── 2. Planos ─────────────────────────────────────────────
  const planos = await Promise.all([
    prisma.plano.upsert({
      where: { id: 'plano-mensal' },
      update: {},
      create: {
        id: 'plano-mensal',
        nome: 'Mensal',
        descricao: 'Acesso completo por 30 dias',
        valorMensal: 89.90,
        valorTotal: 89.90,
        duracaoDias: 30,
      },
    }),
    prisma.plano.upsert({
      where: { id: 'plano-trimestral' },
      update: {},
      create: {
        id: 'plano-trimestral',
        nome: 'Trimestral',
        descricao: 'Acesso completo por 90 dias com 10% de desconto',
        valorMensal: 80.91,
        valorTotal: 242.73,
        duracaoDias: 90,
      },
    }),
    prisma.plano.upsert({
      where: { id: 'plano-anual' },
      update: {},
      create: {
        id: 'plano-anual',
        nome: 'Anual',
        descricao: 'Acesso completo por 365 dias com 20% de desconto',
        valorMensal: 71.92,
        valorTotal: 863.04,
        duracaoDias: 365,
      },
    }),
  ]);
  console.log(`✅ ${planos.length} planos criados`);

  // ── 3. Alunos de exemplo ──────────────────────────────────
  const alunosData = [
    { nome: 'Maria Silva Santos',   cpf: '12345678901', email: 'maria@email.com',   telefone: '81999990001' },
    { nome: 'João Ferreira Costa',  cpf: '23456789012', email: 'joao@email.com',    telefone: '81999990002' },
    { nome: 'Carlos Eduardo Lima',  cpf: '34567890123', email: 'carlos@email.com',  telefone: '81999990003' },
    { nome: 'Ana Paula Rodrigues',  cpf: '45678901234', email: 'ana@email.com',     telefone: '81999990004' },
    { nome: 'Pedro Henrique Souza', cpf: '56789012345', email: 'pedro@email.com',   telefone: '81999990005' },
    { nome: 'Fernanda Oliveira',    cpf: '67890123456', email: 'fernanda@email.com', telefone: '81999990006' },
    { nome: 'Lucas Mendes Alves',   cpf: '78901234567', email: 'lucas@email.com',   telefone: null },
    { nome: 'Juliana Castro',       cpf: '89012345678', email: null,                telefone: '81999990008' },
  ];

  for (const dados of alunosData) {
    const aluno = await prisma.aluno.upsert({
      where: { cpf: dados.cpf },
      update: {},
      create: { ...dados, adminId: admin.id },
    });

    // Matrícula com plano aleatório
    const plano = planos[Math.floor(Math.random() * planos.length)];
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - Math.floor(Math.random() * 20));
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + plano.duracaoDias);

    const matriculaExistente = await prisma.matricula.findFirst({
      where: { alunoId: aluno.id, status: 'ATIVA' },
    });

    if (!matriculaExistente) {
      const matricula = await prisma.matricula.create({
        data: { alunoId: aluno.id, planoId: plano.id, dataInicio, dataFim },
      });

      const mesRef = `${dataInicio.getFullYear()}-${String(dataInicio.getMonth() + 1).padStart(2, '0')}`;

      // 30% dos alunos com pagamento atrasado (para demo)
      const isAtrasado = Math.random() < 0.3;
      const vencimento = new Date(dataInicio);

      await prisma.pagamento.create({
        data: {
          matriculaId: matricula.id,
          valor: plano.valorTotal,
          dataVencimento: vencimento,
          dataPagamento: isAtrasado ? null : new Date(),
          status: isAtrasado ? 'ATRASADO' : 'PAGO',
          metodoPagamento: isAtrasado ? null : 'PIX',
          referenciaMes: mesRef,
        },
      });
    }
  }

  console.log(`✅ ${alunosData.length} alunos criados com matrículas e pagamentos`);
  console.log('\n🎉 Seed concluído! Credenciais de acesso:');
  console.log('   E-mail: admin@academia.com');
  console.log('   Senha:  Admin@123\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
