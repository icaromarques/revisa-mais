import { Request, Response } from 'express';
import { oauth2Client, SCOPES } from '../config/google';
import { prisma } from '../config/prisma';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

export const authController = {
  // Gera a URL para o usuário clicar e ir para o Google
  getAuthUrl(req: Request, res: Response) {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Importante: Garante que receberemos um refresh_token
      scope: SCOPES,
      prompt: 'consent' // Força a tela de consentimento para sempre mandar o refresh_token
    });
    res.json({ url });
  },

  // Rota de callback (Onde o Google redireciona após login)
  async googleCallback(req: Request, res: Response) {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code not provided' });
    }

    try {
      // 1. Troca o código pelo access_token e refresh_token
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // 2. Pega informações do perfil do usuário
      const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
      const userInfo = await oauth2.userinfo.get();
      
      const email = userInfo.data.email!;
      const googleId = userInfo.data.id!;
      const nome = userInfo.data.name || 'Usuário';

      // 3. Busca ou cria o usuário no nosso banco (PostgreSQL)
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          nome,
          // Se o Google nos deu um refresh_token novo, atualizamos. Senão, mantemos o antigo.
          googleRefreshToken: tokens.refresh_token || undefined,
          gcalConnected: true,
          gcalEmail: email,
          gcalTokenStatus: 'active'
        },
        create: {
          id: googleId,
          email,
          nome,
          googleRefreshToken: tokens.refresh_token || null,
          gcalConnected: true,
          gcalEmail: email,
          gcalTokenStatus: 'active'
        }
      });

      // 4. Cria o JWT para o Frontend (Session Cookie)
      const sessionToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' } // 7 dias de sessão no app
      );

      // 5. Configura o Cookie HTTP-Only (Mais seguro contra XSS que localStorage)
      res.cookie('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      });

      // 6. Redireciona o usuário de volta para o Frontend (Dashboard)
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);

    } catch (error) {
      console.error('Auth Error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
  },

  // Retorna os dados da sessão atual
  async getSession(req: Request, res: Response) {
    // Esse endpoint passará pelo middleware 'requireAuth'
    const userId = (req as any).user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        gcalConnected: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  },

  // Faz logout limpando o cookie
  async logout(req: Request, res: Response) {
    res.clearCookie('session');
    res.json({ success: true });
  }
};