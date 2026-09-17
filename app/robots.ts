import type { MetadataRoute } from "next"

// Archivo robots.txt de RENACLI para buscadores

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.renacli.com.ar/sitemap.xml",
  }
}
