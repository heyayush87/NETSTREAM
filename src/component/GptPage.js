import React from "react";
import GptSearchbarPage from "./GptSearchbarPage";
import GptMovieSuggestion from "./GptMovieSuggestion";
import { bglogo } from "../utils/constant";

const GptPage = () => {
  return (
    <div className="relative w-full min-h-dvh flex flex-col overflow-hidden">
      {/* ✅ Background Image that grows with content */}
      <div className="-z-10 w-full">
        <img
          src={bglogo}
          alt="bg-Logo"
          className="w-full h-full object-cover object-center fixed top-0 left-0 min-h-screen"
        />
        {/* Optional: dark gradient overlay */}
        <div className="fixed inset-0 bg-gradient-to-b from-black/90 via-black/60 to-black/90 -z-10" />
      </div>

      {/* ✅ Foreground Content */}
      <div className="pt-8 px-2 sm:px-4 md:px-8 w-full max-w-7xl mx-auto text-white flex flex-col gap-6 flex-grow z-10 relative">
        <GptSearchbarPage />
        <GptMovieSuggestion />
      </div>
    </div>
  );
};

export default GptPage;
