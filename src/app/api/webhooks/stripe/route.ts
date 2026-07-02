import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { createReceiptPdf } from "@/lib/invoice";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build") as string, {
  apiVersion: "2025-02-24.acacia" as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) throw new Error("Missing stripe signature or secret.");
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { userId, jobId, jobTitle, candidateEmail } = session.metadata || {};
    if (!userId || !jobId) return NextResponse.json({ received: true });

    // Ensure payment not already recorded
    const existing = await prisma.payment.findUnique({ where: { transaction_id: session.payment_intent as string } });
    if (!existing) {
      const payment = await prisma.payment.create({
        data: {
          user_id: userId,
          job_id: jobId,
          amount: (session.amount_total || 0) / 100, // Convert from cents
          currency: "USD",
          payment_method: "stripe",
          payment_status: "completed",
          transaction_id: session.payment_intent as string,
        }
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      try {
        if (user) {
          await createReceiptPdf(payment.id, user.full_name, user.email, jobTitle || "Job", payment.amount, payment.transaction_id as string, payment.created_at);
        }
      } catch (receiptErr) {
        console.error("Failed to generate/send receipt for Stripe webhook:", receiptErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}
