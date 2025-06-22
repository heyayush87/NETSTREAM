import { useDispatch } from "react-redux";
import { API_OPTIONS, CLOUDLFARE_PROXY_URL } from "../utils/constant";
import { addTrailer } from "../utils/movieSlice";
import { useEffect } from "react";

const UseMovieTrailer = (movieid) => {
  const dispatch = useDispatch();

  async function getdata() {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieid}/videos?language=en-US`;
      const response = await fetch(
        CLOUDLFARE_PROXY_URL + "?url=" + encodeURIComponent(tmdbUrl),
        API_OPTIONS
      );

      // console.log(response);

      if (!response.ok) {
        // console.log("Api error");
        throw new Error(` from useMovieTrailer ,${response.status}`);
        return;
      }
      const data = await response.json();

      const filterdata = data.results.filter(
        (video) => video.type === "Trailer"
      );
      const trailer = filterdata.length ? filterdata[0] : data.results;
      //   console.log(trailer);
      dispatch(addTrailer(trailer));
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    getdata();
  }, []);
  return;
};
export default UseMovieTrailer;
