import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { prisma } from './config/prisma';

// Routes
import authRoutes from './routes/auth.routes';
import materiaRoutes from './routes/materia.routes';
import topicoRoutes from './routes/topico.routes';
import sessaoRoutes from './routes/sessao.routes';
import revisaoRoutes from './routes/revisao.routes';
import eventoRoutes from './routes/evento.routes';
import scheduleRoutes from './routes/schedule.routes';
import webhookRoutes from './routes/webhook.routes';
import aiRoutes from './routes/ai.routes';
import userRoutes from './routes/user.routes';
import ocorrenciaRoutes from './routes/ocorrencia.routes';
import materialRoutes from './routes/material.routes';
import disponibilidadeRoutes from './routes/disponibilidade.routes';
import aulaRoutes from './routes/aula.routes';
import resumoRoutes from './routes/resumo.routes';
import notaRoutes from './routes/nota.routes';
import notificacaoRoutes from './routes/notificacao.routes';
import adminRoutes from './routes/admin.routes';
import integrationRoutes from './routes/integration.routes';
import cadernoRoutes from './routes/caderno.routes';
import questaoRoutes from './routes/questao.routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

// Registrando Rotas
app.use('/api/auth', authRoutes);
app.use('/api/materias', materiaRoutes);
app.use('/api/topicos', topicoRoutes);
app.use('/api/sessoes', sessaoRoutes);
app.use('/api/revisoes', revisaoRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/ocorrencias', ocorrenciaRoutes);
app.use('/api/materiais', materialRoutes);
app.use('/api/disponibilidade', disponibilidadeRoutes);
app.use('/api/aulas', aulaRoutes);
app.use('/api/resumos', resumoRoutes);
app.use('/api/notas', notaRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/cadernos', cadernoRoutes);
app.use('/api/questoes', questaoRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
