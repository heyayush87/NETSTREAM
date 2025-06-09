import { useSelector } from "react-redux";
import UseMovieTrailer from "../Hooks/UseMovieTrailer";

const Videobcg = ({ movieid }) => {
  const trailerVideo = useSelector((store) => store.movies?.Trailer);

  UseMovieTrailer(movieid);

  return (
    <div className="w-screen max-w-none">
      <div className="relative w-full aspect-video max-h-[60vh] sm:max-h-[70vh] md:max-h-[80vh] lg:max-h-[90vh]">
        {/* Responsive 16:9 Aspect Ratio */}
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-none"
          src={
            "https://www.youtube-nocookie.com/embed/" +
            trailerVideo?.key +
            "?&autoplay=1&mute=1"
          }
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};
export default Videobcg;
