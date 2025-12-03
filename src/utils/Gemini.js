import { GoogleGenerativeAI } from "@google/generative-ai";

const Gemini = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_KEY, {
  dangerouslyAllowBrowser: true,
});

export default Gemini;
