-- RENACLI: estrellas provisorias asignadas únicamente por administración.
-- No son votos y no intervienen en el promedio de calificaciones reales.

alter table public.matriculados
  add column if not exists estrellas_manuales smallint;

alter table public.matriculados
  drop constraint if exists matriculados_estrellas_manuales_check;

alter table public.matriculados
  add constraint matriculados_estrellas_manuales_check
  check (
    estrellas_manuales is null
    or estrellas_manuales between 1 and 5
  );

comment on column public.matriculados.estrellas_manuales is
  'Valoración provisoria de 1 a 5 asignada por administración. Se muestra solo hasta que la reputación real queda habilitada públicamente.';
