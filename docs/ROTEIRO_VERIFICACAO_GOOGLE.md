# 🎬 Roteiro de Vídeo para Verificação do Google OAuth (Google Cloud Console)

O Google exige um vídeo de demonstração hospedado no YouTube para aprovar os escopos sensíveis (`calendar.events` e `drive.file`). O vídeo não precisa ter áudio, mas deve mostrar etapas específicas de forma muito clara. O avaliador é humano.

## 📝 O Roteiro Perfeito (Duração: ~60 a 90 segundos)

**Preparação (Antes de dar o REC):**
1. Abra o site do Revisa+ (Ex: a URL final da Vercel).
2. Certifique-se de que você está **deslogado** do app.
3. Abra a aba do Google Calendar em outra guia para mostrar o evento depois.
4. **IMPORTANTE:** O seu programa de gravação de tela **deve capturar a barra de endereços (URL)** do seu navegador. 

---

### Ação! (Gravando)

**1. [0:00 - 0:10] Início e Login**
- Mostre a tela de login inicial do Revisa+.
- Clique no botão "Entrar com Google".

**2. [0:10 - 0:25] A Tela do Google (MUITO IMPORTANTE)**
- Quando a janela do Google (popup de contas) abrir, **não clique na conta ainda**.
- Clique na barra de endereço (URL) da própria popup do Google.
- Vá para a direita na URL e selecione com o mouse/grife a parte onde diz `client_id=123456789...`.
- *Por que fazer isso?* O Google exige ver o número do seu Client ID na URL do navegador durante o fluxo. Sem isso, eles rejeitam o vídeo de imediato.
- Após mostrar o ID, selecione a sua conta do Google e avance na tela de consentimento de permissões.

**3. [0:25 - 0:40] A Ação de Escrita (Google Calendar)**
- Após o login bem-sucedido, já dentro do Dashboard do Revisa+, navegue até a área de Grade de Aulas, Planner ou Sessões.
- Crie um agendamento com um título fácil de identificar. Exemplo: "Estudo de Matemática Avançada - Teste".
- Preencha o horário (ex: para daqui a 30 minutos) e clique no botão de Salvar/Agendar no app.

**4. [0:40 - 1:00] A Prova na Agenda Oficial**
- Alterne para a aba do navegador onde o seu Google Calendar pessoal está aberto.
- Mostre a agenda do dia atual.
- Aponte com o mouse que o evento "Estudo de Matemática Avançada - Teste" acabou de aparecer lá dentro, sincronizado pelo aplicativo.
- Fim da gravação! Pode parar o vídeo.

---

## 📤 Pós-Gravação (Como enviar)

1. Faça o upload do arquivo de vídeo gerado para a sua conta no **YouTube**.
2. Na aba de visibilidade do YouTube, marque o vídeo como **"Não Listado"** (Unlisted). Assim, ele fica privado e apenas quem tiver o link (o funcionário do Google) poderá ver.
3. Copie o link do YouTube.
4. No Google Cloud Console (APIs & Services > OAuth consent screen > Verification), cole este link no campo "YouTube Demo Video".

Se você seguir essas 4 etapas mostrando tudo direitinho, a aprovação do escopo sensível da agenda costuma sair em 3 a 5 dias úteis sem dores de cabeça!