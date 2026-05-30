import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Target, History, Focus, Layout, Users } from 'lucide-react';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-on-surface relative overflow-hidden main-gradient">
      {/* Top Navigation Bar */}
      <nav className="bg-background/80 backdrop-blur-[10px] border-b border-outline sticky top-0 z-50 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-on-surface flex items-center gap-2">Revisa<span className="text-primary">+</span></Link>
          <div className="hidden md:flex gap-6 items-center">
            <a href="#funcionalidades" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">Funcionalidades</a>
            <a href="#como-funciona" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">Como Funciona</a>
            <a href="#para-quem" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">Indicado Para</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/dashboard" className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-all text-sm shadow-xl shadow-primary/20">
              Ir para o App
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-sm font-bold text-on-surface hover:text-primary transition-colors">Entrar</Link>
              <Link to="/cadastro" className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-all text-sm shadow-xl shadow-primary/20">
                Criar Conta
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2 px-3 py-1 bg-surface-container-highest rounded-full border border-outline/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Sua base de estudos unificada</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] text-on-surface max-w-4xl">
            Sua vida acadêmica, <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">organizada de verdade.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed mt-6 max-w-2xl font-medium">
            Centralize suas matérias, planeje semanas reais, acompanhe seu progresso e estude com foco. Tudo integrado no Revisa+ para você parar de perder tempo organizando e começar a executar.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Link to={user ? "/dashboard" : "/cadastro"} className="bg-on-surface text-background px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
              {user ? 'Acessar seu Dashboard' : 'Começar grátis agora'}
            </Link>
            <a href="#como-funciona" className="bg-surface-container-high border border-outline/20 text-on-surface px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-highest transition-all">
              Ver como funciona
            </a>
          </div>
        </section>

        {/* Problem State / "O que o Revisa+ Resolve" */}
        <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto" id="problema">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-surface-container-lowest border border-outline/10 p-8 md:p-12 rounded-3xl">
              <div>
                 <h2 className="text-3xl font-bold text-on-surface mb-4">Pare de espalhar sua rotina.</h2>
                 <p className="text-on-surface-variant leading-relaxed mb-6 font-medium">
                    Anotações em um app, cronograma em uma planilha, flashcards em outro lugar e a sensação de que você sempre está esquecendo uma revisão importante. O Revisa+ conecta as pontas soltas da sua jornada estudantil.
                 </p>
                 <ul className="space-y-3">
                   <li className="flex items-center gap-3 text-sm font-bold text-error/80">
                      <div className="w-5 h-5 rounded-full bg-error/10 flex items-center justify-center text-[10px]">✕</div>
                      Esquecer matérias acumuladas
                   </li>
                   <li className="flex items-center gap-3 text-sm font-bold text-error/80">
                      <div className="w-5 h-5 rounded-full bg-error/10 flex items-center justify-center text-[10px]">✕</div>
                      Planejar semanas que não dão certo
                   </li>
                   <li className="flex items-center gap-3 text-sm font-bold text-success/80 mt-4">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-[10px]">✓</div>
                      Tudo centralizado, mensurável e claro
                   </li>
                 </ul>
              </div>
              <div className="bg-surface-container border border-outline/10 rounded-2xl p-6 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none"></div>
                 <div className="flex items-center justify-between border-b border-outline/10 pb-4 mb-4">
                    <div className="flex gap-2">
                       <span className="w-3 h-3 rounded-full bg-error/50"></span>
                       <span className="w-3 h-3 rounded-full bg-secondary/50"></span>
                       <span className="w-3 h-3 rounded-full bg-success/50"></span>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="h-10 bg-background/50 rounded flex items-center px-4 gap-3 text-sm font-bold text-on-surface/50 line-through"><div className="w-4 h-4 rounded border border-on-surface/20"></div> Revisar Biologia celular (Atrasado)</div>
                    <div className="h-10 bg-background/50 rounded flex items-center px-4 gap-3 text-sm font-bold text-on-surface/50 line-through"><div className="w-4 h-4 rounded border border-on-surface/20"></div> PDF Solto_resumo_v2.pdf</div>
                    <div className="h-12 bg-primary/10 border border-primary/20 rounded flex items-center px-4 gap-3 text-sm font-bold text-primary shadow-sm"><CheckCircle2 className="w-5 h-5" /> Hoje: 2 Revisões Pendentes, 1 Meta Ativa</div>
                 </div>
              </div>
           </div>
        </section>

        {/* Feature Section */}
        <section id="funcionalidades" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Tudo o que você precisa</span>
            <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-4">Seu estúdio de aprendizagem real</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">Nós construímos ferramentas funcionais e diretas para transformar você em um estudante mais constante.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline/10 hover:border-primary/30 transition-all flex flex-col gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Metas e Progresso</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Crie metas reais (como "Estudar 20h" ou "10 Revisões") e acompanhe seu progresso de verdade através do seu Perfil Analytics.</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline/10 hover:border-primary/30 transition-all flex flex-col gap-6">
              <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Planner Semanal</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Arraste e solte suas tarefas, aulas e sessões de estudo para organizar de forma visual e viável o que você fará a cada dia.</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline/10 hover:border-primary/30 transition-all flex flex-col gap-6">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Controle de Revisões</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Pare de esquecer tópicos cruciais. Cadastre blocos de matérias e saiba visualmente se suas revisões estão em dia ou atrasadas.</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline/10 hover:border-primary/30 transition-all flex flex-col gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Gestão de Matérias</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Crie seu semestre, estruture tópicos, controle suas notas e centralize todo o histórico de um assunto no mesmo painel.</p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline/10 hover:border-primary/30 transition-all flex flex-col gap-6 md:col-span-2">
              <div className="flex flex-col md:flex-row gap-6 h-full">
                <div className="flex-1">
                   <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6">
                     <Focus className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-bold text-on-surface mb-2">Apoio Inteligente de IA</h3>
                   <p className="text-on-surface-variant text-sm leading-relaxed mb-4">Use a inteligência artificial ao seu favor, sem depender só dela. Gere Flashcards dinâmicos a partir de anotações ou peças para a IA resumir tópicos difíceis enquanto você estuda, funcionando como seu assistente particular, atuando onde o trabalho manual seria demorado.</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Como Funciona */}
        <section id="como-funciona" className="py-24 px-6 relative">
          <div className="absolute inset-0 bg-surface-container-lowest/50 border-y border-outline/5 -z-10"></div>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-4">Como o Revisa+ funciona</h2>
              <p className="text-on-surface-variant">Siga 3 passos simples para assumir o controle dos seus estudos.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
               <div className="hidden md:block absolute top-[28px] left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0"></div>
               
               <div className="relative text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-surface border-2 border-primary flex items-center justify-center text-xl font-black text-primary mb-6 z-10">1</div>
                  <h3 className="text-lg font-bold text-on-surface mb-3">Monte sua Base</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">Cadastre suas matérias, crie tópicos para estudar e deixe sua área de trabalho pronta. Mapeie o que importa.</p>
               </div>
               
               <div className="relative text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-surface border-2 border-primary flex items-center justify-center text-xl font-black text-primary mb-6 z-10">2</div>
                  <h3 className="text-lg font-bold text-on-surface mb-3">Planeje e Execute</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">Use o planner semanal para distribuir as tarefas. Registre suas sessões de estudo na plataforma e veja seu progresso em tempo real.</p>
               </div>
               
               <div className="relative text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-surface border-2 border-primary flex items-center justify-center text-xl font-black text-primary mb-6 z-10">3</div>
                  <h3 className="text-lg font-bold text-on-surface mb-3">Acompanhe Metas</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">Defina metas (em horas ou revisões), veja as estatísticas do seu perfil melhorarem e construa constância sólida.</p>
               </div>
            </div>
          </div>
        </section>

        {/* Indicado Para */}
        <section id="para-quem" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-4">Indicado Para</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto font-medium text-lg leading-relaxed">
              Estruturado para diferentes rotinas acadêmicas, com foco em organização, constância e execução real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-3xl bg-surface-container border border-outline/10 hover:border-primary/30 transition-all">
              <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                Universitários com múltiplas demandas
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Para quem precisa conciliar disciplinas, aulas, trabalhos, provas, revisões e materiais sem perder o controle da rotina.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-surface-container border border-outline/10 hover:border-primary/30 transition-all">
              <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-3">
                <Layout className="w-5 h-5 text-tertiary" />
                Estudantes que precisam de método
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Para quem quer sair do improviso e transformar planejamento, estudo e revisão em um fluxo claro e contínuo.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-surface-container border border-outline/10 hover:border-primary/30 transition-all">
              <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-3">
                <Focus className="w-5 h-5 text-secondary" />
                Rotinas acadêmicas intensas
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Para quem lida com prazos simultâneos, conteúdos extensos e precisa visualizar o que estudar, quando revisar e o que priorizar.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-surface-container border border-outline/10 hover:border-primary/30 transition-all">
              <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                Quem busca centralização real
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Para quem quer reunir matérias, sessões, revisões, calendário, materiais e progresso em um único sistema.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto rounded-[3rem] bg-surface-container border border-outline/10 p-12 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-primary/5">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface leading-tight">Chega de improviso.<br/>Organize seus estudos hoje.</h2>
              <p className="text-on-surface-variant text-lg max-w-xl mx-auto font-medium">Crie sua conta gratuitamente e experimente um hub acadêmico que realmente faz sentido.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <Link to="/cadastro" className="bg-primary text-on-primary px-10 py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/20">
                  Criar conta grátis
                </Link>
                <Link to="/login" className="bg-surface-container-high border border-outline/20 text-on-surface px-10 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-highest transition-all">
                  Entrar na plataforma
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-outline/10 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="text-xl font-black text-on-surface flex items-center gap-1">Revisa<span className="text-primary">+</span></span>
              <p className="text-xs text-on-surface-variant font-medium">Sua rotina acadêmica unificada.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              <a href="#funcionalidades" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Funcionalidades</a>
              <a href="#como-funciona" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Como Funciona</a>
              <Link to="/cadastro" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Criar Conta</Link>
              <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Login</Link>
            </div>
          </div>
        </footer>
      </main>

      {/* Side Decoration */}
      <div className="fixed top-0 right-0 w-1/3 h-screen bg-primary/5 blur-[150px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-1/4 h-screen bg-tertiary/3 blur-[150px] pointer-events-none -z-10"></div>
    </div>
  );
}

