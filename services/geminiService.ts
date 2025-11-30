import { GoogleGenAI, Type } from "@google/genai";
import { CategorySuggestion, ParsedExpense } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const analyzeExpense = async (prompt: string): Promise<ParsedExpense> => {
  try {
    const aiPrompt = `
      Analise o texto e extraia os dados da despesa. Retorne um JSON.
      Texto: "${prompt}"
      
      Campos requeridos:
      - description: O que foi comprado (curto)
      - amount: Valor (número)
      - card: Nome do cartão se mencionado (ex: Nubank, Visa, Master) ou null
      - purchaser: Quem comprou (Gustavo ou Laryssa) se mencionado ou null
      - category: Categoria (Alimentação, Transporte, Lazer, Saúde, Casa, Serviços, Compras, Viagem)
      - insight: Comentário curto e divertido (max 10 palavras)
      
      Se não encontrar algum dado, use null ou tente inferir pelo contexto.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            card: { type: Type.STRING, nullable: true },
            purchaser: { type: Type.STRING, nullable: true },
            category: { type: Type.STRING },
            insight: { type: Type.STRING }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");

    return JSON.parse(jsonText) as ParsedExpense;

  } catch (error) {
    console.error("Error analyzing expense:", error);
    throw error;
  }
};
