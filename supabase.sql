-- =====================================================
--  Portfólio Heitor · CONFIGURAÇÃO COMPLETA DO SUPABASE
--  Cole este script no SQL Editor e rode UMA vez:
--    Supabase Dashboard -> SQL Editor -> New query -> Run
--
--  ⚠ ESTE SCRIPT CORRIGE O BANCO ANTIGO:
--   * a tabela `atividades` estava SEM a estrutura certa
--   * a tabela `anexos` tinha um formato incompatível
--   * o bucket de imagens "portfolio" NÃO EXISTIA
--   * o Realtime não estava ativado
--
--  É seguro rodar de novo (é idempotente). As tabelas
--  `atividades` e `anexos` só são substituídas se estiverem
--  VAZIAS. Se tiverem dados, o script avisa e não mexe nelas.
-- =====================================================

-- -----------------------------------------------------
-- 1) Tabela de LOGIN (usuarios)
--    Mantém as contas existentes (não é apagada).
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
--    SÓ É SUBSTITUÍDA SE ESTIVER VAZIA.
-- -----------------------------------------------------
do $$
begin
    if to_regclass('public.atividades') is not null
       and exists (select 1 from public.atividades limit 1) then
        raise notice 'AVISO: public.atividades NÃO está vazia. Nada foi alterado nela.';
        return;
    end if;

    drop table if exists public.atividades;

    create table public.atividades (
        id        text primary key,
        area      text not null,
        eixo      int  not null default 1,
        nome      text not null,
        data      text,
        src       text not null,
        criado_em timestamptz default now()
    );

    alter table public.atividades enable row level security;

    drop policy if exists "atividades_publico" on public.atividades;
    create policy "atividades_publico"
        on public.atividades
        for all
        to anon, authenticated
        using (true)
        with check (true);
end $$;

-- -----------------------------------------------------
-- 3) Tabela de ANEXOS (um registro global, com JSON)
--    SÓ É SUBSTITUÍDA SE ESTIVER VAZIA.
-- -----------------------------------------------------
do $$
begin
    if to_regclass('public.anexos') is not null
       and exists (select 1 from public.anexos limit 1) then
        raise notice 'AVISO: public.anexos NÃO está vazia. Nada foi alterado nela.';
        return;
    end if;

    drop table if exists public.anexos;

    create table public.anexos (
        id        text primary key,
        dados     jsonb not null default '{}'::jsonb,
        criado_em timestamptz default now()
    );

    alter table public.anexos enable row level security;

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
-- 5) REALTIME (sincronização ao vivo entre abas/dispositivos)
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

-- -----------------------------------------------------
-- 6) Recarrega o schema na API (vale na hora, sem espera)
-- -----------------------------------------------------
notify pgrst, 'reload schema';

-- =====================================================
--  OBSERVAÇÕES
--  -----------
--  * Login usa a tabela `usuarios` (email + senha), igual
--    ao que já existia. Contas antigas continuam valendo.
--  * Para adicionar/editar usuários:
--      Supabase Dashboard -> Table Editor -> usuarios
--  * O site salva as atividades em `atividades` e os anexos
--    em `anexos` (um único registro, chave `portfolio`),
--    com as imagens no bucket "portfolio".
--  * ATIVIDADES E ANEXOS SÃO GLOBAIS (compartilhados):
--    qualquer pessoa logada vê e edita o mesmo conteúdo.
--  * REALTIME: o item 5 ativa a sincronização ao vivo.
--    Confirme também em Dashboard -> Database -> Replication
--    que `atividades` e `anexos` estão ativadas no
--    "Supabase Realtime".
--  * Se o script disser "NÃO está vazia" em alguma tabela,
--    é porque existem dados antigos. Para substituí-la,
--    apague os registros pela Table Editor e rode de novo.
-- =====================================================