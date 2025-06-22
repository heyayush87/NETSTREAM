import { useSelector } from "react-redux";
import UseMovieTrailer from "../Hooks/UseMovieTrailer";

const Videobcg = ({ movieid }) => {
  const trailerVideo = useSelector((store) => store.movies?.Trailer);
  UseMovieTrailer(movieid);

  return (
    <div className="absolute top-0 left-0 w-full h-full z-0">
      <iframe
        className="w-full h-full object-cover"
        src={
          "https://www.youtube-nocookie.com/embed/" +
          trailerVideo?.key +
          "?&autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&showinfo=0"
        }
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default Videobcg;
