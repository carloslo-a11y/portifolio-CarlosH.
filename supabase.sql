-- =====================================================
--  Portfólio Heitor · Configuração do Supabase
--  Cole este código no SQL Editor do seu projeto
--  (Supabase Dashboard -> SQL Editor -> New query -> Run)
--
--  Pode rodar mais de uma vez sem quebrar nada.
-- =====================================================

-- -----------------------------------------------------
-- 1) Tabela de LOGIN (usuarios)
--    Mantém a mesma estrutura já usada no seu site
--    (as contas existentes continuam funcionando).
-- -----------------------------------------------------
create table if not exists public.usuarios (
    id        serial primary key,
    nome      text not null,
    email     text not null unique,
    senha     text not null,
    tipo      text not null default 'aluno',
    criado_em timestamptz default now()
);

alter table public.usuarios enable row level security;

do $$
begin
    drop policy if exists "usuarios_publico" on public.usuarios;
    create policy "usuarios_publico"
        on public.usuarios
        for all
        to anon, authenticated
        using (true)
        with check (true);
end $$;

-- -----------------------------------------------------
-- 2) Tabela de ATIVIDADES (fotos das 5 áreas)
--    area: natureza | matematica | linguagens | humanas | senai
-- -----------------------------------------------------
create table if not exists public.atividades (
    id        text primary key,
    email     text not null,
    area      text not null,
    eixo      int  not null default 1,
    nome      text not null,
    data      text,
    src       text not null,
    criado_em timestamptz default now()
);

alter table public.atividades enable row level security;

do $$
begin
    drop policy if exists "atividades_publico" on public.atividades;
    create policy "atividades_publico"
        on public.atividades
        for all
        to anon, authenticated
        using (true)
        with check (true);
end $$;

-- -----------------------------------------------------
-- 3) Tabela de ANEXOS (um registro por usuário, JSON)
-- -----------------------------------------------------
create table if not exists public.anexos (
    email     text primary key,
    dados     jsonb not null default '{}'::jsonb,
    criado_em timestamptz default now()
);

alter table public.anexos enable row level security;

do $$
begin
    drop policy if exists "anexos_publico" on public.anexos;
    create policy "anexos_publico"
        on public.anexos
        for all
        to anon, authenticated
        using (true)
        with check (true);
end $$;

-- -----------------------------------------------------
-- 4) Bucket "portfolio" (público) para as imagens
-- -----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

drop policy if exists "portfolio_publico" on storage.objects;

create policy "portfolio_publico"
    on storage.objects
    for all
    to anon, authenticated
    using (bucket_id = 'portfolio')
    with check (bucket_id = 'portfolio');

-- -----------------------------------------------------
-- 5) REALTIME (sincronização ao vivo em todas as abas/dispositivos)
--    Precisa ser ativado nas tabelas usadas pelo site.
--    Rodar isso habilita os eventos INSERT / UPDATE / DELETE
--    que o site escuta para atualizar em tempo real.
-- -----------------------------------------------------
do $$
begin
    alter publication supabase_realtime add table public.atividades;
exception
    when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.anexos;
exception
    when duplicate_object then null;
end $$;

-- =====================================================
--  OBSERVAÇÕES
--  -----------
--  * O login usa a tabela `usuarios` (email + senha),
--    igual ao que já existia no seu Git — nenhuma conta
--    antiga é perdida ao rodar esse script.
--
--  * Para adicionar/editar usuários:
--      Supabase Dashboard -> Table Editor -> usuarios
--
--  * As imagens das atividades e anexos ficam no bucket
--    "portfolio" e o link é salvo nas tabelas acima.
--
--  * ATIVIDADES E ANEXOS SÃO GLOBAIS (compartilhados):
--    qualquer usuário logado vê e edita o mesmo conteúdo.
--    Não são mais filtrados por e-mail.
--
--  * REALTIME: o item 5 ativa a sincronização ao vivo.
--    Se o seu projeto for criado novo no dashboard, confirme
--    também em Supabase Dashboard -> Database -> Replication
--    que as tabelas `atividades` e `anexos` estão marcadas
--    com o "Supabase Realtime".
--
--  * IMPORTANTE: este script antigo salvava as atividades
--    apenas no navegador (IndexedDB/localStorage) quando o
--    e-mail não estava logado. Dados que ficaram só no seu
--    computador não existem na nuvem — se depois de publicar
--    nada aparecer, adicione novamente as atividades pelo
--    formulário (logado), e elas passam a ser salvas na nuvem.
-- =====================================================