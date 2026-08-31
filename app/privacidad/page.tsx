import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

const SECCIONES = [
  {
    titulo: "1. Responsable y alcance",
    parrafos: [
      "RENACLI es un sistema privado de evaluación, acreditación, registro y verificación de matrículas de técnicos en climatización y refrigeración.",
      "Esta Política de Privacidad explica qué datos personales pueden ser recopilados, para qué se utilizan y qué información puede mostrarse públicamente dentro del sistema RENACLI.",
    ],
  },
  {
    titulo: "2. Datos que pueden recopilarse",
    parrafos: [
      "Para gestionar la solicitud, evaluación, alta, administración y renovación de una matrícula, RENACLI podrá registrar datos identificatorios y de contacto, documentación aportada por el interesado, fotografía, especialidad, localidad, provincia, fechas de emisión y vencimiento, estado de la matrícula y antecedentes administrativos vinculados al registro.",
      "Los datos que no sean necesarios para la consulta pública permanecerán destinados a la gestión interna y no deberán mostrarse en la ficha pública del matriculado.",
    ],
  },
  {
    titulo: "3. Finalidades del tratamiento",
    parrafos: [
      "Los datos serán utilizados para identificar al solicitante o matriculado, gestionar su evaluación y acreditación, emitir y renovar su matrícula RENACLI, administrar su estado registral, generar credenciales y permitir la verificación de autenticidad.",
      "También podrán utilizarse para comunicaciones relacionadas con la matrícula, vencimientos, renovaciones, documentación, reclamos, medidas administrativas y cuestiones necesarias para el funcionamiento del registro.",
    ],
  },
  {
    titulo: "4. Información de consulta pública",
    parrafos: [
      "Con autorización expresa del matriculado, RENACLI podrá publicar los datos estrictamente necesarios para que terceros puedan verificar su identidad y el estado de su acreditación.",
      "La consulta pública podrá incluir nombre y apellido, fotografía, número de matrícula RENACLI, especialidad, localidad y provincia, estado de la matrícula y fechas de emisión y vencimiento.",
      "RENACLI no publicará en la consulta pública el DNI, domicilio particular, correo electrónico personal ni observaciones administrativas del matriculado.",
    ],
  },
  {
    titulo: "5. Consentimiento",
    parrafos: [
      "Cuando corresponda, el interesado deberá prestar su consentimiento de manera previa, libre e informada. Las opciones de aceptación deberán presentarse sin marcar previamente.",
      "RENACLI podrá conservar constancia de la fecha de aceptación y de la versión de los documentos aceptados para acreditar el consentimiento otorgado.",
    ],
  },
  {
    titulo: "6. Conservación y seguridad",
    parrafos: [
      "RENACLI procurará conservar los datos durante el tiempo necesario para las finalidades del registro y para mantener la trazabilidad administrativa correspondiente.",
      "Se aplicarán medidas razonables de seguridad destinadas a evitar accesos, alteraciones, pérdidas o tratamientos no autorizados de la información.",
    ],
  },
  {
    titulo: "7. Acceso, actualización, rectificación y supresión",
    parrafos: [
      "El titular de los datos podrá solicitar el acceso a sus datos personales y, cuando corresponda, su actualización, rectificación o supresión conforme a la normativa aplicable.",
      "Las solicitudes podrán realizarse utilizando los medios de contacto oficiales publicados por RENACLI en este sitio.",
    ],
  },
  {
    titulo: "8. Servicios tecnológicos",
    parrafos: [
      "Para el funcionamiento técnico del sitio y de la base de datos, RENACLI puede utilizar proveedores tecnológicos que intervienen en el alojamiento, almacenamiento, seguridad y operación de la plataforma.",
      "El uso de dichos servicios deberá limitarse a lo necesario para el funcionamiento del sistema y sujetarse a las condiciones y medidas de protección correspondientes.",
    ],
  },
  {
    titulo: "9. Cambios en esta política",
    parrafos: [
      "RENACLI podrá actualizar esta Política de Privacidad cuando resulte necesario por cambios operativos, tecnológicos, normativos o de funcionamiento.",
      "Cuando una modificación requiera una nueva aceptación del matriculado, RENACLI podrá solicitar nuevamente su consentimiento y registrar la versión aceptada.",
    ],
  },
  {
    titulo: "10. Contacto",
    parrafos: [
      "Para consultas relacionadas con privacidad o con los datos personales registrados en RENACLI, el interesado podrá utilizar el correo electrónico, teléfono o demás medios de contacto oficiales publicados al pie de esta página.",
    ],
  },
]

export default function PrivacidadPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a RENACLI
            </Link>

            <div className="mt-6 flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-6" aria-hidden="true" />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Protección de datos personales
                </p>

                <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Política de Privacidad RENACLI
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Información sobre el tratamiento, utilización y publicación de
                  datos personales dentro del sistema RENACLI.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Importante:</strong> RENACLI
              es un sistema privado de evaluación, acreditación y registro. Su
              matrícula no sustituye habilitaciones, licencias, matrículas o
              registros exigidos por autoridades competentes cuando
              correspondan.
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-7 rounded-xl border border-border bg-muted/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Versión de la Política de Privacidad
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Versión 1.0 — vigente desde su publicación en el sitio RENACLI.
            </p>
          </div>

          <div className="space-y-4">
            {SECCIONES.map((seccion) => (
              <article
                key={seccion.titulo}
                className="rounded-xl border border-border bg-card p-5 sm:p-6"
              >
                <h2 className="text-lg font-bold text-foreground sm:text-xl">
                  {seccion.titulo}
                </h2>

                <div className="mt-4 space-y-3">
                  {seccion.parrafos.map((parrafo) => (
                    <p
                      key={parrafo}
                      className="text-sm leading-7 text-muted-foreground sm:text-base"
                    >
                      {parrafo}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/reglamento"
              className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Ver Reglamento General
            </Link>

            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
