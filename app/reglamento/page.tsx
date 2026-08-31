import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

const SECCIONES = [
  {
    titulo: "1. Objeto",
    parrafos: [
      "El presente Reglamento establece las condiciones de ingreso, evaluación, acreditación, permanencia, renovación, suspensión y baja de las personas incorporadas al Registro RENACLI vinculadas con actividades de refrigeración, climatización y aire acondicionado.",
      "RENACLI tiene como finalidad promover la capacitación, la identificación de técnicos acreditados, las buenas prácticas profesionales, la seguridad y la actualización técnica.",
      "La acreditación RENACLI es de carácter privado y no reemplaza las habilitaciones, matrículas o registros obligatorios establecidos por autoridades nacionales, provinciales, municipales, consejos o colegios profesionales cuando correspondan.",
    ],
  },
  {
    titulo: "2. Requisitos para solicitar la matrícula",
    parrafos: [
      "Podrá solicitar su incorporación quien cumpla los requisitos establecidos por RENACLI.",
      "Como mínimo deberá acreditar identidad, presentar la documentación solicitada, proporcionar una fotografía actual, informar datos de contacto y acreditar formación, capacitación o experiencia vinculada con refrigeración, climatización y aire acondicionado, según corresponda.",
      "El solicitante deberá aceptar este Reglamento, la política de privacidad y las condiciones de utilización de la credencial.",
      "La presentación de documentación no garantiza automáticamente el otorgamiento de la matrícula.",
    ],
  },
  {
    titulo: "3. Evaluación",
    parrafos: [
      "RENACLI podrá establecer una evaluación teórica, práctica o teórico-práctica destinada a comprobar los conocimientos necesarios para la categoría solicitada.",
      "La evaluación podrá comprender refrigeración y climatización, seguridad eléctrica, manipulación responsable de refrigerantes, vacío, estanqueidad, detección de fugas, instalación, mantenimiento, diagnóstico y buenas prácticas.",
      "La matrícula será otorgada únicamente cuando el postulante cumpla los requisitos documentales y apruebe la evaluación correspondiente.",
    ],
  },
  {
    titulo: "4. Emisión de la matrícula",
    parrafos: [
      "Una vez aprobada la solicitud, RENACLI asignará al técnico un número individual y emitirá una credencial identificatoria.",
      "La credencial podrá contener nombre y apellido, fotografía, número RENACLI, especialidad o categoría, fecha de emisión, fecha de vencimiento, estado y código QR de verificación.",
      "La credencial será personal e intransferible.",
    ],
  },
  {
    titulo: "5. Vigencia",
    parrafos: [
      "La matrícula tendrá la vigencia establecida por RENACLI desde su fecha de emisión.",
      "Al vencimiento, su estado cambiará a VENCIDA hasta que se complete la renovación.",
      "Una matrícula vencida no deberá mostrarse públicamente como vigente.",
    ],
  },
  {
    titulo: "6. Obligaciones del matriculado",
    parrafos: [
      "El matriculado deberá actuar conforme a buenas prácticas técnicas y de seguridad.",
      "Deberá utilizar adecuadamente su identificación RENACLI, mantener actualizados sus datos, abstenerse de prestar o ceder su credencial, informar correctamente a sus clientes y cumplir las normas legales aplicables a los trabajos que realice.",
      "El uso de la matrícula RENACLI no exime al técnico de cumplir otras habilitaciones o requisitos legales que pudieran corresponder.",
    ],
  },
  {
    titulo: "7. Reclamos de clientes",
    parrafos: [
      "RENACLI podrá disponer un mecanismo para recibir reclamos relacionados con técnicos registrados.",
      "La existencia de un reclamo no determinará por sí sola una sanción, suspensión ni baja.",
      "RENACLI deberá analizar razonablemente la información presentada y diferenciar una disconformidad comercial de un posible incumplimiento técnico, de seguridad o del presente Reglamento.",
      "Los comentarios u opiniones de clientes no se considerarán automáticamente antecedentes disciplinarios comprobados.",
    ],
  },
  {
    titulo: "8. Derecho a descargo",
    parrafos: [
      "Cuando exista un reclamo o antecedente que pueda producir una medida contra el matriculado, RENACLI deberá comunicarle los hechos que se le atribuyen y permitirle efectuar su descargo.",
      "El matriculado podrá presentar documentación, fotografías, presupuestos, comprobantes u otros elementos relacionados con el caso.",
      "La decisión deberá basarse en los antecedentes disponibles y guardar proporcionalidad con la situación analizada.",
    ],
  },
  {
    titulo: "9. Advertencia",
    parrafos: [
      "Para incumplimientos menores RENACLI podrá emitir una advertencia sin suspender la matrícula.",
      "La advertencia podrá quedar registrada internamente como antecedente administrativo y no necesariamente será de carácter público.",
    ],
  },
  {
    titulo: "10. Suspensión",
    parrafos: [
      "RENACLI podrá disponer una suspensión temporal ante incumplimientos relevantes del Reglamento, prácticas técnicas potencialmente inseguras, utilización indebida de la credencial, irregularidades documentales que deban verificarse, reiteración de incumplimientos o situaciones graves que requieran investigación.",
      "Durante la suspensión, la verificación mediante QR deberá indicar claramente el estado SUSPENDIDA.",
      "El técnico no podrá presentarse como matriculado RENACLI vigente durante ese período.",
    ],
  },
  {
    titulo: "11. Suspensión preventiva",
    parrafos: [
      "Excepcionalmente, cuando existan elementos objetivos que indiquen un riesgo serio para personas o instalaciones, falsificación, suplantación de identidad o utilización fraudulenta de la credencial, RENACLI podrá disponer una suspensión preventiva mientras analiza el caso.",
      "La suspensión preventiva no significa que el técnico haya sido declarado responsable.",
      "Deberá otorgársele posteriormente posibilidad de descargo.",
    ],
  },
  {
    titulo: "12. Rehabilitación",
    parrafos: [
      "Una matrícula suspendida podrá recuperar el estado VIGENTE cuando desaparezca la causa de suspensión y se cumplan las condiciones establecidas por RENACLI.",
      "RENACLI podrá solicitar documentación, capacitación, nueva evaluación o cualquier medida razonablemente relacionada con el motivo de la suspensión.",
    ],
  },
  {
    titulo: "13. Baja definitiva",
    parrafos: [
      "Podrán constituir causas de baja la falsificación de documentación, la obtención fraudulenta de la matrícula, la cesión deliberada de la credencial a terceros, la suplantación de identidad, la reincidencia en incumplimientos graves, la utilización de RENACLI para engañar a consumidores, la realización comprobada de prácticas gravemente inseguras o continuar presentándose deliberadamente como vigente durante una suspensión.",
      "Salvo situaciones excepcionales debidamente justificadas, la baja deberá producirse después del procedimiento de revisión y descargo.",
    ],
  },
  {
    titulo: "14. Efectos de la baja",
    parrafos: [
      "Cuando una matrícula sea dada de baja, el QR deberá informar DADA DE BAJA / NO VIGENTE.",
      "La credencial dejará de acreditar al titular dentro de RENACLI.",
      "RENACLI podrá conservar internamente el historial administrativo de la matrícula conforme a las reglas legales aplicables sobre conservación y protección de datos.",
    ],
  },
  {
    titulo: "15. Renovación",
    parrafos: [
      "La renovación podrá requerir actualización de datos y documentación y, cuando RENACLI lo determine razonablemente, actualización o reevaluación de conocimientos.",
      "La renovación no deberá alterar la fecha histórica de primera acreditación y deberá generar una nueva fecha de vencimiento.",
    ],
  },
  {
    titulo: "16. Protección de datos",
    parrafos: [
      "RENACLI deberá informar qué datos recopila, para qué los utiliza, cuáles serán públicos y cuáles permanecerán reservados.",
      "Los datos publicados deberán limitarse a los necesarios para verificar la identidad y condición del matriculado.",
      "DNI, domicilio particular, correo electrónico, documentación presentada, observaciones administrativas y antecedentes internos no deberán publicarse en la consulta pública.",
      "Nombre, fotografía, número de matrícula, especialidad, estado y fechas de vigencia podrán formar parte de la ficha pública de verificación.",
    ],
  },
  {
    titulo: "17. Código QR y consulta pública",
    parrafos: [
      "El QR de la credencial permitirá consultar directamente el estado registrado en RENACLI.",
      "Los estados de la matrícula podrán ser VIGENTE, SUSPENDIDA, VENCIDA o DADA DE BAJA.",
      "La consulta pública mostrará solamente los datos necesarios para verificar la acreditación y la identidad del técnico.",
    ],
  },
  {
    titulo: "18. Prohibición de cesión",
    parrafos: [
      "La matrícula y la credencial son personales e intransferibles.",
      "Queda prohibido prestar, alquilar, transferir, vender o permitir que otra persona utilice la identificación RENACLI del matriculado.",
    ],
  },
  {
    titulo: "19. Uso del nombre RENACLI",
    parrafos: [
      "La incorporación al registro autoriza al matriculado a indicar su condición de acreditado RENACLI únicamente mientras la matrícula se encuentre vigente.",
      "No podrá utilizar logos, credenciales o referencias a RENACLI de forma que induzcan a pensar que posee una habilitación estatal cuando ésta no exista.",
    ],
  },
  {
    titulo: "20. Modificaciones del Reglamento",
    parrafos: [
      "RENACLI podrá actualizar este Reglamento por razones técnicas, administrativas, legales o de seguridad.",
      "Los cambios sustanciales deberán ser comunicados a los matriculados y conservarse identificados mediante número de versión y fecha de entrada en vigencia.",
    ],
  },
]

export default function ReglamentoPage() {
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
                  Reglamento General
                </p>

                <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Reglamento General RENACLI
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Condiciones de ingreso, evaluación, acreditación, permanencia,
                  renovación, suspensión y baja dentro del Registro RENACLI.
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
              Versión del Reglamento
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Versión 1.0 — Documento inicial sujeto a futuras actualizaciones.
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

          <div className="mt-8 rounded-xl border border-border bg-muted/50 p-5 text-sm leading-relaxed text-muted-foreground">
            Este Reglamento podrá complementarse con la Política de Privacidad,
            los Términos de Uso y el Procedimiento de Reclamos y Descargo de
            RENACLI.
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
