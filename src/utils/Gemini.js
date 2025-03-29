import { GoogleGenerativeAI } from "@google/generative-ai";

const Gemini = new GoogleGenerativeAI({
  apiKey: process.env.REACT_APP_GEMINI_KEY, // Use the environment variable
});

export default Gemini;
