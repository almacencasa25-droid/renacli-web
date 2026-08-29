import {
  QrCode,
  ShieldCheck,
  Thermometer,
  UserPlus,
  PauseCircle,
  UserX,
  RefreshCw,
} from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Verificador } from "@/components/verificador"

const INFORMACION = [
  {
    icono: ShieldCheck,
    titulo: "Consulta oficial",
    texto:
      "Verifique si un técnico se encuentra matriculado y habilitado por el registro.",
  },
  {
    icono: Thermometer,
    titulo: "Refrigeración y climatización",
    texto:
      "Matrículas de técnicos en refrigeración, aire acondicionado y climatización.",
  },
  {
    icono: QrCode,
    titulo: "Carnet con código QR",
    texto:
      "Cada carnet posee un código QR que abre directamente la ficha del matriculado.",
  },
]

const REGLAMENTO = [
  {
    icono: UserPlus,
    titulo: "¿Cómo obtener la matrícula RENACLI?",
    contenido: [
      "Ser mayor de edad y acreditar identidad con documentación válida.",
      "Presentar la documentación y los datos personales solicitados por RENACLI.",
      "Acreditar formación, conocimientos o experiencia vinculados con refrigeración, aire acondicionado y climatización, según la categoría solicitada.",
      "Aprobar la evaluación teórica y/o práctica establecida por RENACLI para comprobar conocimientos técnicos y buenas prácticas.",
      "Demostrar conocimientos básicos de seguridad eléctrica, manipulación responsable de refrigerantes, vacío, estanqueidad, detección de fugas e instalación segura.",
      "Aceptar el reglamento, las condiciones de uso de la matrícula y el código de conducta de RENACLI.",
      "Presentar una fotografía actual para la identificación del matriculado y la emisión de su carnet.",
      "Cumplir con los requisitos administrativos vigentes al momento de solicitar el alta.",
    ],
    nota:
      "La aprobación de la matrícula queda sujeta a la verificación de la documentación y al cumplimiento de los requisitos establecidos por RENACLI.",
  },
  {
    icono: PauseCircle,
    titulo: "¿Por qué puede suspenderse una matrícula?",
    contenido: [
      "Incumplimientos técnicos o administrativos que requieran revisión.",
      "Realización de trabajos con prácticas inseguras o que puedan poner en riesgo a personas, instalaciones o equipos.",
      "Reclamos graves o reiterados que requieran una evaluación por parte de RENACLI.",
      "Incumplimiento de normas de seguridad o de buenas prácticas profesionales.",
      "Uso indebido de la matrícula, del carnet o de los elementos identificatorios de RENACLI.",
      "Falta de actualización o regularización de documentación requerida.",
      "Incumplimiento de obligaciones previstas en el reglamento de RENACLI.",
    ],
    nota:
      "La suspensión es una medida temporal. El matriculado podrá presentar su descargo y, cuando corresponda, regularizar la situación para solicitar la rehabilitación de su matrícula.",
  },
  {
    icono: UserX,
    titulo: "¿Por qué puede darse de baja una matrícula?",
    contenido: [
      "Presentación de documentación falsa o adulterada para obtener o mantener la matrícula.",
      "Cesión, préstamo o utilización de la matrícula por una persona distinta de su titular.",
      "Uso deliberado de datos falsos o engañosos vinculados con la acreditación RENACLI.",
      "Reincidencia en incumplimientos graves luego de suspensiones o advertencias anteriores.",
      "Prácticas profesionales graves que generen un riesgo comprobado para personas o instalaciones.",
      "Continuar utilizando la matrícula o presentarse como habilitado mientras exista una suspensión vigente.",
      "Incumplimientos graves del reglamento que justifiquen la pérdida de la acreditación RENACLI.",
    ],
    nota:
      "Antes de una baja definitiva deberá existir una revisión del caso y la posibilidad de que el matriculado presente su descargo. Una denuncia o reclamo, por sí solo, no implica automáticamente la baja.",
  },
  {
    icono: RefreshCw,
    titulo: "Renovación y mantenimiento de la matrícula",
    contenido: [
      "La matrícula debe encontrarse dentro de su período de vigencia.",
      "El matriculado deberá solicitar la renovación antes o después del vencimiento, según las condiciones establecidas por RENACLI.",
      "Los datos de contacto y demás información relevante deberán mantenerse actualizados.",
      "RENACLI podrá solicitar actualización de documentación o conocimientos cuando resulte necesario.",
      "El técnico deberá continuar cumpliendo las buenas prácticas, normas de seguridad y condiciones del registro durante toda la vigencia de su matrícula.",
    ],
    nota:
      "Una matrícula vencida no se muestra como vigente hasta que la renovación sea aprobada y registrada.",
  },
]

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Consulta pública de matrículas
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground text-balance sm:text-4xl">
              Verificación de Matrícula
            </h1>

            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Consulte el estado de un técnico matriculado.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <Verificador />
        </div>

        <section className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {INFORMACION.map((item) => {
              const Icono = item.icono

              return (
                <div
                  key={item.titulo}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <Icono
                    className="size-5 text-primary"
                    aria-hidden="true"
                    strokeWidth={1.75}
                  />

                  <h2 className="mt-3 text-sm font-bold text-foreground">
                    {item.titulo}
                  </h2>

                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {item.texto}
                  </p>
                </div>
              )
            })}
          </div>

          <p className="mt-6 rounded-lg border border-border bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground text-pretty">
            Aviso: la información exhibida proviene del registro oficial de
            RENACLI. Por razones de privacidad no se publican el DNI, el
            domicilio particular, el correo electrónico ni las observaciones
            administrativas del matriculado.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Información para técnicos y público
            </p>

            <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
              Información sobre la Matrícula RENACLI
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Consulte los requisitos para obtener la matrícula y las
              condiciones relacionadas con su vigencia, suspensión, baja y
              renovación.
            </p>
          </div>

          <div className="space-y-3">
            {REGLAMENTO.map((item) => {
              const Icono = item.icono

              return (
                <details
                  key={item.titulo}
                  className="group overflow-hidden rounded-xl border border-border bg-card"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-foreground transition-colors hover:bg-muted/50 sm:px-6">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icono
                        className="size-5"
                        aria-hidden="true"
                        strokeWidth={1.75}
                      />
                    </span>

                    <span className="flex-1">{item.titulo}</span>

                    <span
                      className="text-xl font-normal text-muted-foreground transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>

                  <div className="border-t border-border px-5 py-5 sm:px-6">
                    <ul className="space-y-3">
                      {item.contenido.map((punto) => (
                        <li
                          key={punto}
                          className="flex gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base"
                        >
                          <span
                            className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                          <span>{punto}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed text-foreground">
                      <strong>Importante:</strong> {item.nota}
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
