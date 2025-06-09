import React from "react";
import GptSearchbarPage from "./GptSearchbarPage";
import GptMovieSuggestion from "./GptMovieSuggestion";
import { bglogo } from "../utils/constant";

const GptPage = () => {
  return (
    <div className="relative min-h-screen w-full">
      <div className="fixed inset-0 -z-10 w-full h-full">
        <img
          src={bglogo}
          alt="bg-Logo"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Content container */}
      <div className="pt-8 px-2 sm:px-4 md:px-8 w-full max-w-7xl mx-auto text-white">
        <GptSearchbarPage />
        <GptMovieSuggestion />
      </div>
    </div>
  );
};

export default GptPage;
