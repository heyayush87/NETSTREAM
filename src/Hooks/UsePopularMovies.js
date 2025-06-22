
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { addPopularMovies } from "../utils/movieSlice";
import { API_OPTIONS, CLOUDLFARE_PROXY_URL } from "../utils/constant";

const UsePopularMovies = () => {
  const dispatch = useDispatch();
  async function getdata() {
    try {
      const tmdbUrl =
        "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1";
      const response = await fetch(
        CLOUDLFARE_PROXY_URL + "?url=" + encodeURIComponent(tmdbUrl),
        API_OPTIONS
      );
      if (!response.ok) {
        throw new Error(`From popular Movies Api,${response.status}`);
      }
      const data = await response.json();
      dispatch(addPopularMovies(data.results));
      // console.log(data);
    } catch (error) {
      console.error(error);
    }
  }
  useEffect(() => {
    getdata();
  }, []);
};

export default UsePopularMovies;
