import React from "react";
import { IMG_CDN_URL } from "../utils/constant";

const MovieCard = ({ posterpath }) => {
  if (!posterpath) return null;

  return (
    <div className="w-48 pr-4">
      <img
        src={`${IMG_CDN_URL}${posterpath}`}
        alt="Movie Poster"
        className="rounded-lg shadow-lg"
      />
    </div>
  );
};

export default MovieCard;
