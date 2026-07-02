import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Hardcoded knowledge base as fallback when DB is unavailable
const FALLBACK_KB = `
Vertex International Recruitment Ltd. actively recruits foreign workers for unskilled, semi-skilled, and engineering graduate roles.

JOB CATEGORIES:
- Factory Jobs: Assembly line worker, packaging worker, machine operator, production assistant (automotive, electronics, food industries)
- Construction Jobs: General laborer, mason helper, steel fixer, painter assistant
- Technical Jobs: Maintenance technician, electrician assistant, CNC machine operator, HVAC technician
- Warehouse Jobs: Warehouse picker, packing staff, inventory assistant, forklift operator
- Food Processing Jobs: Meat processing, chicken factory worker, food packaging

PACKAGE & BENEFITS:
- Salary: €1,000 - €1,500 per month
- Overtime available
- Accommodation and meals often provided
- Medical Insurance included

ELIGIBILITY & REQUIREMENTS:
- Valid passport required
- Job offer and contract must be secured
- Medical certificate required
- Police clearance required
- Unskilled workers: High School Diploma only
- Semi-skilled workers: Certificate needed
- Engineering/Technical: Higher education degree or diploma required

CONTACT:
- WhatsApp: +44 7440 167608 / +44 7438 299563 / +44 7405 368405 / +44 7438 613251
- Telegram: @Vertexinternational1
- Email: vertex@vertexintern.com
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // 1. Check if AI is enabled (fail open if DB unavailable)
    let aiEnabled: any = null;
    try {
      aiEnabled = await prisma.systemSetting.findUnique({ where: { key: "ai_enabled" } });
    } catch {
      // DB unavailable — default to enabled
    }

    if (aiEnabled && aiEnabled.value === "false") {
      return Response.json({ error: "AI Assistant is currently offline." }, { status: 403 });
    }

    // 2. Fetch Knowledge Base (fallback to hardcoded if DB unavailable)
    let kbText = "";
    try {
      const knowledgeItems = await prisma.knowledgeArticle.findMany({
        select: { title: true, content: true },
      });
      if (knowledgeItems && (knowledgeItems as any[]).length > 0) {
        kbText = (knowledgeItems as any[])
          .map((k: any) => `--- ${k.title} ---\n${k.content}`)
          .join("\n\n");
      }
    } catch {
      // DB unavailable — use hardcoded knowledge base
    }

    const systemPrompt = `You are the official AI Assistant for Vertex International Recruitment Ltd.
Answer user questions about jobs, the application process, visas, and documentation professionally and concisely.

Rules:
- Be polite, professional, and concise.
- Use the Knowledge Base below for specific process questions.
- Never invent information not in the Knowledge Base.
- If unsure, direct users to WhatsApp +44 7440 167608 or email vertex@vertexintern.com.
- Do NOT screen CVs or make hiring decisions.

--- VERTEX KNOWLEDGE BASE ---
${kbText || FALLBACK_KB}`;

    // 3. Generate response using Google Gemini
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      system: systemPrompt,
      messages,
    });

    return Response.json({ text });
  } catch (error) {
    console.error("Chat API Error:", error);
    return Response.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
