import React from "react";
import Videobcg from "./Videobcg";

import VideoTitle from "./VideoTitle";
import { useSelector } from "react-redux";

const MainContainer = () => {
  const movies = useSelector((store) => store.movies?.nowPlayingMovies);
  // console.log("maincontainer", movies);

  if (!movies) return;

  const mainMovies = movies[0];
  // console.log("movie id and name", mainMovies);

  const { original_title, overview, id } = mainMovies;

  return (
    <div>
      <VideoTitle title={original_title} overview={overview} />
      <Videobcg movieid={id} />
    </div>
  );
};

export default MainContainer;
