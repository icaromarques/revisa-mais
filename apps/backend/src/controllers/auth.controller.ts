import { Request, Response } from 'express';
import { oauth2Client, SCOPES } from '../config/google';
import { prisma } from '../config/prisma';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { googleCalendarService } from '../services/googleCalendar.service';

async function syncGoogleProfilePicture(userId: string, picture: string | null | undefined) {
  if (!picture) return;

  const existingProfile = await prisma.userProfile.findUnique({ where: { userId } });
  const shouldUpdate =
    !existingProfile?.fotoUrl ||
    existingProfile.fotoUrl.includes('googleusercontent.com') ||
    existingProfile.fotoUrl.includes('ggpht.com');

  if (!shouldUpdate) return;

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, fotoUrl: picture },
    update: { fotoUrl: picture }
  });
}

async function fetchGooglePicture(refreshToken: string | null | undefined): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userInfo = await oauth2.userinfo.get();
    return userInfo.data.picture || null;
  } catch (error) {
    console.warn('Could not fetch Google profile picture:', error);
    return null;
  }
}

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
      const picture = userInfo.data.picture || null;

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

      await syncGoogleProfilePicture(user.id, picture);

      googleCalendarService.syncUserCalendar(user.id).catch((err) => {
        console.error('Post-login calendar sync failed:', err);
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
    const userId = (req as any).user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        gcalConnected: true,
        googleRefreshToken: true,
        profile: { select: { fotoUrl: true } }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let fotoUrl = user.profile?.fotoUrl || null;
    if (!fotoUrl) {
      const picture = await fetchGooglePicture(user.googleRefreshToken);
      if (picture) {
        await syncGoogleProfilePicture(user.id, picture);
        fotoUrl = picture;
      }
    }

    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        gcalConnected: user.gcalConnected,
        fotoUrl
      }
    });
  },

  // Faz logout limpando o cookie
  async logout(req: Request, res: Response) {
    res.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ success: true });
  },

  /** Short-lived token for WebSocket auth (works cross-origin without cookie on upgrade). */
  async getWsToken(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const token = jwt.sign(
      { id: userId, purpose: 'ws' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '5m' }
    );
    res.json({ token, expiresIn: 300 });
  }
};