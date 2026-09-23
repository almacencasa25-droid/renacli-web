-- RENACLI: QR de valoración por trabajo (vigencia 24 horas y un solo uso)
create extension if not exists pgcrypto;

create table if not exists public.solicitudes_valoracion_trabajo (
  codigo uuid primary key default gen_random_uuid(),
  matriculado_id bigint not null references public.matriculados(id) on delete cascade,
  creado_en timestamptz not null default now(),
  vence_en timestamptz not null default (now() + interval '24 hours'),
  utilizado_en timestamptz,
  constraint solicitud_valoracion_fechas_validas check (vence_en > creado_en)
);

create index if not exists solicitudes_valoracion_matriculado_idx
  on public.solicitudes_valoracion_trabajo (matriculado_id, creado_en desc);

alter table public.solicitudes_valoracion_trabajo enable row level security;

create or replace function public.crear_solicitud_valoracion_trabajo(
  p_matriculado_id bigint
)
returns table(codigo uuid, vence_en timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.matriculados where id = p_matriculado_id
  ) then
    raise exception 'MATRICULADO_NO_ENCONTRADO';
  end if;

  return query
  insert into public.solicitudes_valoracion_trabajo (matriculado_id)
  values (p_matriculado_id)
  returning solicitudes_valoracion_trabajo.codigo,
            solicitudes_valoracion_trabajo.vence_en;
end;
$$;

create or replace function public.registrar_valoracion_trabajo(
  p_codigo uuid,
  p_puntuacion smallint,
  p_nombre text default null,
  p_comentario text default null
)
returns table(ok boolean, resultado text)
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitud public.solicitudes_valoracion_trabajo%rowtype;
begin
  if p_puntuacion < 1 or p_puntuacion > 5 then
    return query select false, 'PUNTUACION_INVALIDA'::text;
    return;
  end if;

  select * into solicitud
  from public.solicitudes_valoracion_trabajo
  where solicitudes_valoracion_trabajo.codigo = p_codigo
  for update;

  if not found then
    return query select false, 'NO_ENCONTRADA'::text;
    return;
  end if;

  if solicitud.utilizado_en is not null then
    return query select false, 'YA_UTILIZADA'::text;
    return;
  end if;

  if solicitud.vence_en <= now() then
    return query select false, 'VENCIDA'::text;
    return;
  end if;

  insert into public.calificaciones_tecnicos (
    matriculado_id,
    nombre_cliente,
    email_cliente,
    puntuacion,
    comentario,
    estado
  ) values (
    solicitud.matriculado_id,
    nullif(left(trim(coalesce(p_nombre, '')), 120), ''),
    'qr+' || p_codigo::text || '@valoracion.renacli.local',
    p_puntuacion,
    nullif(left(trim(coalesce(p_comentario, '')), 1000), ''),
    'activa'
  );

  update public.solicitudes_valoracion_trabajo
  set utilizado_en = now()
  where solicitudes_valoracion_trabajo.codigo = p_codigo;

  return query select true, 'REGISTRADA'::text;
end;
$$;

create or replace function public.obtener_solicitud_valoracion_trabajo(
  p_codigo uuid
)
returns table(
  matriculado_id bigint,
  vence_en timestamptz,
  utilizado_en timestamptz,
  apellido_nombre text,
  numero_matricula text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.matriculado_id,
    s.vence_en,
    s.utilizado_en,
    m.apellido_nombre,
    m.numero_matricula
  from public.solicitudes_valoracion_trabajo s
  join public.matriculados m on m.id = s.matriculado_id
  where s.codigo = p_codigo
  limit 1;
$$;

revoke all on function public.crear_solicitud_valoracion_trabajo(bigint) from public, anon, authenticated;
revoke all on function public.registrar_valoracion_trabajo(uuid, smallint, text, text) from public, anon, authenticated;
revoke all on function public.obtener_solicitud_valoracion_trabajo(uuid) from public;
grant execute on function public.crear_solicitud_valoracion_trabajo(bigint) to service_role;
grant execute on function public.registrar_valoracion_trabajo(uuid, smallint, text, text) to service_role;
grant execute on function public.obtener_solicitud_valoracion_trabajo(uuid) to anon, authenticated, service_role;
