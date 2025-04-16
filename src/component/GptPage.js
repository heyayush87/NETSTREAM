import React from "react";
import GptSearchbarPage from "./GptSearchbarPage";
import GptMovieSuggestion from "./GptMovieSuggestion";
import { bglogo } from "../utils/constant";

const GptPage = () => {
  return (
    <div>
      {/* Fixed background logo */}
      <div className="fixed top-0 left-0 -z-10 w-full h-full">
        <img
          src={bglogo}
          alt="bg-Logo"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <GptSearchbarPage />
        <GptMovieSuggestion />
      </div>
    </div>
  );
};

export default GptPage;
