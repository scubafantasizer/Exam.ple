import { Router, type IRouter } from "express";
import {
  db,
  settingsTable,
  chatMessagesTable,
  chatSessionsTable,
} from "@shared/db";
import { AiAgentBody, AiAgentResponse } from "@shared/api-zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { SKILLS_MD, FUNCTION_DECLARATIONS, executeFunction, ActionPerformed, AVAILABLE_MODELS, SYSTEM_INSTRUCTION_SUFFIX } from "../lib/agent-core";

const router: IRouter = Router();

async function handleAiAgentRequest(
  parsed: any,
  sessionId?: number
): Promise<{ text: string; actions: ActionPerformed[] }> {
  const settingsRows = await db.select().from(settingsTable).limit(1);
  const apiKey = settingsRows[0]?.geminiApiKey;
  if (!apiKey) throw new Error("API Key not found");

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemPrompt = `${SKILLS_MD}\n\n${SYSTEM_INSTRUCTION_SUFFIX}`;
  
  let model: any = null;
  for (const mName of AVAILABLE_MODELS) {
    try {
      model = genAI.getGenerativeModel({
        model: mName,
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS as any }],
      });
      break;
    } catch (e) {}
  }
  
  if (!model) throw new Error("No model available");

  const chat = model.startChat();
  const actions: ActionPerformed[] = [];
  let candidate = await chat.sendMessage(parsed.content);
  let lastResponse = candidate.response;
  let turns = 0;
  let finalBotText = "";

  while (turns < 5) {
    const functionCalls = lastResponse.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const functionResponses: any[] = [];
      for (const call of functionCalls) {
        const { result, action } = await executeFunction(
          call.name,
          call.args as Record<string, unknown>,
          sessionId
        );
        if (action) actions.push(action);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { result },
          },
        });
      }
      const nextResult = await chat.sendMessage(functionResponses);
      lastResponse = nextResult.response;
      turns++;
    } else {
      try {
        finalBotText = lastResponse.text();
      } catch (e) {
        finalBotText = "İşlem başarılı.";
      }
      break;
    }
  }

  return { text: finalBotText || "İşlem başarılı.", actions };
}

router.post("/ai-agent", async (req, res): Promise<void> => {
  const parsed = AiAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { text, actions } = await handleAiAgentRequest(parsed.data);
    res.json(AiAgentResponse.parse({ text, actions }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
