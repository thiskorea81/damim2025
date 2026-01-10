import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

/**
 * Gemini 텍스트 생성 (최신 SDK 반영)
 * @param {string} apiKey - 교사의 Gemini API Key
 * @param {string} prompt - 입력 프롬프트
 * @returns {Promise<string>} 생성된 텍스트
 */
export const generateGemini = async (apiKey, prompt) => {
  if (!apiKey) throw new Error("Gemini API Key가 없습니다. 설정에서 키를 등록해주세요.");

  try {
    // [최신 사용법 적용] GoogleGenAI 인스턴스 생성
    const ai = new GoogleGenAI({ apiKey });

    // 모델 호출 및 콘텐츠 생성
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // 요청하신 모델명
      contents: prompt,
    });

    // [최신 사용법 적용] response.text 속성 접근
    return response.text;
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Gemini 응답을 불러오는데 실패했습니다.");
  }
};

/**
 * GPT 텍스트 생성 (요청하신 최신 사용법 유지)
 * @param {string} apiKey - 교사의 OpenAI API Key
 * @param {string} prompt - 입력 프롬프트
 * @returns {Promise<string>} 생성된 텍스트
 */
export const generateGpt = async (apiKey, prompt) => {
  if (!apiKey) throw new Error("GPT API Key가 없습니다. 설정에서 키를 등록해주세요.");

  try {
    // 클라이언트 생성
    const client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true 
    });

    // [요청하신 사용법 유지] client.responses.create
    const response = await client.responses.create({
      model: "gpt-5.2", // 요청하신 모델명
      input: prompt
    });

    // output_text 반환
    return response.output_text;
    
  } catch (error) {
    console.error("GPT API Error:", error);
    throw new Error("GPT 응답을 불러오는데 실패했습니다: " + error.message);
  }
};