import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import sharp from "sharp";
import { config } from "../config/envConfig";
import logger from "./LoggerService";
import { GeminiResponse } from "../types/types";
import { DocumentValidationSchema } from "../validators/validators";

const validationTextPrompt = `
You are an expert document verification assistant for civil registration in Zimbabwe. 
Analyze the attached image and perform the following checks:
1. Clarity Check: Is the image clear, fully visible, well-lit, and completely legible? (Check for blurriness, glare, or cut-off edges).
2. Document Classification: Identify the type of document. It must be one of the specified allowed types.
3. Jurisdiction/Authenticity Check: Verify if it is an authentic-looking Zimbabwean civil document by looking for standard markers (e.g., Zimbabwean Coat of Arms, Registrar General branding, or official medical facility stamps/letterheads).
`;

const fetchImageFromSupabase = async (supabaseImageUrl: string[]) => {
  const imageArrayBuffer = await Promise.all(
    supabaseImageUrl.map(async (imageUrl) => {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      return await imageResponse.arrayBuffer();
    }),
  );

  return {
    imageArrayBuffer,
  };
};

const compressImage = async (arrayBuffer: ArrayBuffer) => {
  const resizedBuffer = await sharp(arrayBuffer)
    .resize({ width: 512, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const base64Image = resizedBuffer.toString("base64");
  return {
    base64Image,
  };
};

export const validateImage = async (
  supabaseImageUrl: string[],
): Promise<GeminiResponse | undefined> => {
  try {
    const { imageArrayBuffer } = await fetchImageFromSupabase(supabaseImageUrl);
    const imageBase64 = await Promise.all(
      imageArrayBuffer.map(async (arrayBuffer) => {
        const { base64Image } = await compressImage(arrayBuffer);
        return base64Image;
      }),
    );

    const model = new ChatGoogleGenerativeAI({
      apiKey: config.GEMINI_API_KEY,
      model: "gemini-2.5-flash", // Fast, lightweight multimodal model
      temperature: 0,
    });

    const structuredModel = model.withStructuredOutput(
      DocumentValidationSchema,
    );

    const result = (await structuredModel.invoke([
      new HumanMessage({
        content: [
          {
            type: "text",
            text: validationTextPrompt,
          },
          ...imageBase64.map((image) => ({
            type: "image_url",
            image_url: `data:image/jpeg;base64,${image}`,
          })),
        ],
      }),
    ])) as GeminiResponse;

    return result;
  } catch (error: any) {
    logger.error(`An error occurred while validating image: ${error.message}`);
  }
};

export default validateImage;
