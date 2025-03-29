import React from "react";
import GptSearchbarPage from "./GptSearchbarPage";
import GptMovieSuggestion from "./GptMovieSuggestion";
import { bglogo } from "../utils/constant";
const GptPage = () => {
  return (
    <div>
      <div className="fixed -z-10">
        <img src={bglogo} alt="bg-Logo" />
      </div>

      <GptSearchbarPage />
      <GptMovieSuggestion />
    </div>
  );
};

export default GptPage;
