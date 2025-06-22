import React from "react";
import Videobcg from "./Videobcg";
import VideoTitle from "./VideoTitle";
import { useSelector } from "react-redux";

const MainContainer = () => {
  const movies = useSelector((store) => store.movies?.nowPlayingMovies);
  if (!movies) return null;

  const mainMovies = movies[0];
  const { original_title, overview, id } = mainMovies;

  return (
    <div className="relative w-full aspect-video min-h-dvh overflow-hidden">
      <Videobcg movieid={id} />
      <VideoTitle title={original_title} overview={overview} />
    </div>
  );
};

export default MainContainer;
