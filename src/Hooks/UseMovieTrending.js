import { API_OPTIONS } from "../utils/constant";
import { useDispatch, useSelector } from "react-redux";
import { addTrendingMovies } from "../utils/movieSlice";
import { useEffect } from "react";

const UseMovieTrending = () => {
  const dispatch = useDispatch();

  const getNowPlayingMovies = async () => {
    try {
      const response = await fetch(
        "https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=1",
        API_OPTIONS
      );

      if (!response.ok) {
        throw new Error(`${response.status}`);
        return;
      }

      const data = await response.json();
      // console.log("FRom Trending Movies", data.results);

      dispatch(addTrendingMovies(data.results));
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    getNowPlayingMovies();
  }, []);
};

export default UseMovieTrending;
