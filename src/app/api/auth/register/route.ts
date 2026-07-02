import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`register:${ip}`, { max: 5 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("Registration request received", body);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { full_name, email, password, phone, country } = parsed.data;

  console.log("Searching for existing user", email);
  const existing = await prisma.user.findUnique({ where: { email } });
  console.log("Existing user check done", existing);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  console.log("Hashing password...");
  const password_hash = await hashPassword(password);
  console.log("Password hashed.");

  console.log("Creating user in DB...");
  const user = await prisma.user.create({
    data: {
      full_name,
      email,
      password_hash,
      phone,
      country,
      candidate: { create: {} },
    },
    select: { id: true, full_name: true, email: true, role: true },
  });
  console.log("User created in DB", user.id);

  // Send verification email (non-blocking)
  sendVerificationEmail(user.id, user.email, user.full_name).catch(console.error);

  return NextResponse.json(
    {
      message: "Account created successfully. Please check your email to verify your account.",
      user,
    },
    { status: 201 }
  );
}
