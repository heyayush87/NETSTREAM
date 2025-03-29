import React from "react";
import useNowPlayingMovies from "../Hooks/useNowPlayingMovies";
import LoginPage from "./LoginPage";
import MainContainer from "./MainContainer";
import SecondaryContainer from "./SecondaryContainer";
import UsePopularMovies from "../Hooks/UsePopularMovies";
import UseMovieTrending from "../Hooks/UseMovieTrending";
import UseUpcomingMovies from "../Hooks/UseUpcomingMovies";

import { toggleGptsearch } from "../utils/GptSlice";
import { useSelector } from "react-redux";
import GptPage from "./GptPage";

const Browse = () => {
  useNowPlayingMovies();
  UsePopularMovies();
  UseMovieTrending();
  UseUpcomingMovies();
  const toggleGpt = useSelector((store) => store.Gpt.showgptsearch);
  return (
    <div>
      <LoginPage />
      {toggleGpt ? (
        <GptPage />
      ) : (
        <>
          <MainContainer />
          <SecondaryContainer />
        </>
      )}
    </div>
  );
};

export default Browse;
