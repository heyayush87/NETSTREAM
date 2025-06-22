import React from "react";
import useNowPlayingMovies from "../Hooks/useNowPlayingMovies";
import MainContainer from "./MainContainer";
import SecondaryContainer from "./SecondaryContainer";
import UsePopularMovies from "../Hooks/UsePopularMovies";
import UseMovieTrending from "../Hooks/UseMovieTrending";
import UseUpcomingMovies from "../Hooks/UseUpcomingMovies";
import { useSelector } from "react-redux";
import GptPage from "./GptPage";
import LoginPage from "./LoginPage"; // ✅ This is your shared header

const Browse = () => {
  useNowPlayingMovies();
  UsePopularMovies();
  UseMovieTrending();
  UseUpcomingMovies();

  const toggleGpt = useSelector((store) => store.Gpt.showgptsearch);

  return (
    <div
      className={`relative min-h-dvh w-full flex flex-col overflow-x-hidden ${toggleGpt ? "" : "bg-black"
        }`}
    >
      <LoginPage />
  
      {toggleGpt ? (
        <GptPage />
      ) : (
        <div className="w-full flex flex-col gap-4 px-0">
          <MainContainer />
          <SecondaryContainer />
        </div>
      )}
    </div>
  );
};  
export default Browse;
