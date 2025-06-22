import { API_OPTIONS, CLOUDLFARE_PROXY_URL } from "../utils/constant";
import { useDispatch } from "react-redux";
import { addNowPlayingMovies } from "../utils/movieSlice";
import { useEffect } from "react";
const useNowPlayingMovies = () => {
  const dispatch = useDispatch();

  const getNowPlayingMovies = async () => {
    try {
      const tmdbUrl =
        "https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1";
      const response = await fetch(
        CLOUDLFARE_PROXY_URL + "?url=" + encodeURIComponent(tmdbUrl),
        API_OPTIONS
      );
    

      if (!response.ok) {
        throw new Error(`${response.status}`);
        return;
      }

      const data = await response.json();
   

      dispatch(addNowPlayingMovies(data.results));
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    getNowPlayingMovies();
  }, []);
};
export default useNowPlayingMovies;
