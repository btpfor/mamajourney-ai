import { createServerFileRoute } from "@tanstack/react-start/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const ServerRoute = createServerFileRoute("/api/chat").methods({
  POST: async ({ request }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500 });
    }
    const { messages, context }: { messages: UIMessage[]; context?: { week?: number; name?: string } } = await request.json();

    const lovable = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
    });

    const system = `Tu es l'assistant bienveillant de MamaCare AI, une application de suivi de grossesse.
Tu réponds avec douceur, clarté et précaution, en français par défaut.
Contexte utilisatrice: ${context?.name ? `prénom ${context.name}` : "non renseigné"}, ${context?.week ? `semaine de grossesse: ${context.week}` : "semaine inconnue"}.
Règles importantes:
- Rappelle systématiquement que tes réponses ne remplacent pas un avis médical professionnel.
- Pour les questions d'alimentation, médicaments, symptômes inquiétants, recommande de consulter sage-femme ou médecin.
- Sois concise, structurée, chaleureuse, utilise des emojis avec parcimonie.
- Refuse poliment les sujets hors grossesse / santé maternelle / bébé.`;

    const result = streamText({
      model: lovable("google/gemini-2.5-flash"),
      system,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  },
});
