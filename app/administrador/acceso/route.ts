import { NextResponse } from "next/server"

const COOKIE_NAME = "renacli_admin_session"

export async function GET(request: Request) {
  const url = new URL("/administrador", request.url)

  const response = NextResponse.redirect(url)

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })

  return response
}
