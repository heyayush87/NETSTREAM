import React from "react";
import { IMG_CDN_URL } from "../utils/constant";

const MovieCard = ({ posterpath }) => {
  if (!posterpath) return null;

  return (
    <div className="w-28 xs:w-32 sm:w-40 md:w-44 lg:w-48 xl:w-52 2xl:w-56 pr-2 sm:pr-4">
      <img
        src={`${IMG_CDN_URL}${posterpath}`}
        alt="Movie Poster"
        className="rounded-lg shadow-md hover:scale-105 transition-transform duration-300 ease-in-out w-full h-auto object-cover"
      />
    </div>
  );
};

export default MovieCard;
