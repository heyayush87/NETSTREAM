import React from "react";

const GptFallbackUI = ({ onRetry }) => {
  return (
    <div className="flex justify-center mt-16 px-4">
      <div className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black border border-red-600/40 rounded-xl shadow-2xl p-8 text-center">
        <div className="text-5xl mb-4">🤖</div>

        <h2 className="text-xl font-semibold text-white mb-2">
          AI is temporarily unavailable
        </h2>

        <p className="text-gray-400 text-sm mb-6">
          We hit a rate limit or network issue while fetching movie
          recommendations.
        </p>

        <button
          onClick={onRetry}
          className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
        >
          Try Again
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Tip: Try a different movie name if the issue persists.
        </p>
      </div>
    </div>
  );
};

export default GptFallbackUI;
