import { GoogleGenAI } from "@google/genai";
import { config } from "../config/envConfig";
import logger from "./LoggerService";
import { GeminiResponse } from "../types/types";
import { CustomError } from "../errors/errors";

const client = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
});

const validationPrompt = `
You are an expert document verification assistant for civil registration in Zimbabwe. 
Analyze the attached image and perform the following checks:

1. **Clarity Check**: Is the image clear, fully visible, well-lit, and completely legible? (Check for blurriness, glare, or cut-off edges).
2. **Document Classification**: Identify the type of document. It must be one of the following: 
   - "ZIMBABWE_NATIONAL_ID"
   - "ZIMBABWE_BIRTH_CERTIFICATE"
   - "ZIMBABWE_HOSPITAL_BIRTH_RECORD"
   - "UNKNOWN_OR_INVALID"
3. **Jurisdiction/Authenticity Check**: Verify if it is an authentic-looking Zimbabwean civil document by looking for standard markers (e.g., Zimbabwean Coat of Arms, Registrar General branding for certificates/IDs, or official medical facility stamps/letterheads for hospital birth records).

Return your response strictly as a JSON object with this exact structure:
{
  "isValid": boolean (true only if it is clear, fully visible, and a valid Zimbabwean document matching one of the expected types),
  "documentType": string (one of the types listed above),
  "isClear": boolean,
  "isZimbabweanDocument": boolean,
  "confidenceScore": number (between 0.0 and 1.0),
  "reason": string (a concise explanation of any issues found, e.g., "Image is too blurry" or "Not a recognized Zimbabwean document")
}
`;

export const validateImage = async (
  supabaseImageUrl: string,
): Promise<GeminiResponse | undefined> => {
  try {
    const imageResponse = await fetch(supabaseImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const blob = await imageResponse.blob();
    const mimeType = blob.type || "image/jpeg";

    const uploadedFile = await client.files.upload({
      file: blob,
      config: { mimeType: mimeType },
    });

    const interaction = await client.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        {
          type: "text",
          text: validationPrompt,
        },
        {
          type: "image",
          uri: uploadedFile.uri,
          mime_type: uploadedFile.mimeType,
        },
      ],
    });

    if (!interaction.output_text) {
      throw new CustomError(
        "Failed to generate image validation response",
        500,
      );
    }

    let cleanedText = interaction.output_text.trim();
    cleanedText = cleanedText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const response = JSON.parse(cleanedText);
    return response;
  } catch (error: any) {
    logger.error(`An error occurred while validating image: ${error.message}`);
  }
};
