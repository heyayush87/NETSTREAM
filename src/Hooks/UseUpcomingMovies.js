
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { addUpcomingMovies } from "../utils/movieSlice";
import { API_OPTIONS, CLOUDLFARE_PROXY_URL } from "../utils/constant";

const UseUpcomingMovies = () => {
  const dispatch = useDispatch();

  const getNowPlayingMovies = async () => {
    try {
      const tmdbUrl =
        "https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=1";
      const response = await fetch(
        CLOUDLFARE_PROXY_URL + "?url=" + encodeURIComponent(tmdbUrl),
        API_OPTIONS
      );


      if (!response.ok) {
        throw new Error(`${response.status}`);
        return;
      }

      const data = await response.json();
      // console.log(data.results);

      dispatch(addUpcomingMovies(data.results));
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    getNowPlayingMovies();
  }, []);
};

export default UseUpcomingMovies;
