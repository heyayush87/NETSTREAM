import { useSelector } from "react-redux";
import UseMovieTrailer from "../Hooks/UseMovieTrailer";

const Videobcg = ({ movieid }) => {
  const trailerVideo = useSelector((store) => store.movies?.Trailer);
  // console.log("trailer", trailerVideo?.key);

  UseMovieTrailer(movieid);

  return (
    <div className=" w-screen ">
      <iframe
        className="w-screen aspect-video"
        src={
          "https://www.youtube-nocookie.com/embed/" +
          trailerVideo?.key +
          "?&autoplay=1&mute=1"
        }
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      ></iframe>
    </div>
  );
};
export default Videobcg;
