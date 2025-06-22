import { API_OPTIONS, CLOUDLFARE_PROXY_URL } from "../utils/constant";
import { useDispatch} from "react-redux";
import { addTrendingMovies } from "../utils/movieSlice";
import { useEffect } from "react";

const UseMovieTrending = () => {
  const dispatch = useDispatch();

  const getNowPlayingMovies = async () => {
    try {
      const tmdbUrl =
        "https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=1";
      const response = await fetch(
        CLOUDLFARE_PROXY_URL + "?url=" + encodeURIComponent(tmdbUrl),
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
