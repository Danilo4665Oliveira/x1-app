// =============================================================
// routes/index.ts — Mapa de rotas com middlewares encadeados
// =============================================================
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authController, alunoController } from '../controllers/authAlunoController';
import {
  pagamentoController,
  planoController,
  matriculaController,
} from '../controllers/pagamentoController';
import {
  loginSchema,
  cadastroAdminSchema,
  criarAlunoSchema,
  atualizarAlunoSchema,
  criarPlanoSchema,
  atualizarPlanoSchema,
  criarMatriculaSchema,
  registrarPagamentoSchema,
  confirmarPagamentoSchema,
} from '../validators/schemas';

export const router = Router();

// ── Auth ──────────────────────────────────────────────────────
router.post('/auth/login', validate(loginSchema), authController.login);
router.post('/auth/cadastro', validate(cadastroAdminSchema), authController.cadastrar);
router.get('/auth/me', authenticate, authController.me);

// ── Alunos ────────────────────────────────────────────────────
router.get('/alunos', authenticate, alunoController.listar);
router.get('/alunos/:id', authenticate, alunoController.buscarPorId);
router.post('/alunos', authenticate, validate(criarAlunoSchema), alunoController.criar);
router.patch('/alunos/:id', authenticate, validate(atualizarAlunoSchema), alunoController.atualizar);
router.patch('/alunos/:id/toggle-ativo', authenticate, alunoController.toggleAtivo);

// ── Planos ────────────────────────────────────────────────────
router.get('/planos', authenticate, planoController.listar);
router.post('/planos', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(criarPlanoSchema), planoController.criar);
router.patch('/planos/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(atualizarPlanoSchema), planoController.atualizar);
router.delete('/planos/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), planoController.deletar);

// ── Matrículas ────────────────────────────────────────────────
router.post('/matriculas', authenticate, validate(criarMatriculaSchema), matriculaController.criar);

// ── Pagamentos ────────────────────────────────────────────────
router.post('/pagamentos', authenticate, validate(registrarPagamentoSchema), pagamentoController.registrar);
router.patch('/pagamentos/:id/confirmar', authenticate, validate(confirmarPagamentoSchema), pagamentoController.confirmar);
router.get('/pagamentos/historico/:matriculaId', authenticate, pagamentoController.historico);
router.get('/pagamentos/inadimplentes', authenticate, pagamentoController.inadimplentes);

// ── Dashboard Métricas ────────────────────────────────────────
router.get('/dashboard/metricas', authenticate, pagamentoController.metricas);
