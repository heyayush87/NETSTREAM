import { useSelector } from "react-redux";
import UseMovieTrailer from "../Hooks/UseMovieTrailer";

const Videobcg = ({ movieid }) => {
  const trailerVideo = useSelector((store) => store.movies?.Trailer);
  UseMovieTrailer(movieid);

  return (
    <div className="relative w-full h-full">
      {trailerVideo?.key && (
        <div className="absolute top-0 left-0 w-full h-full">
          {/* YouTube iframe with safe area */}
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${trailerVideo.key}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&playsinline=1`}
            title={`YouTube trailer for ${movieid}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />

          {/* Safe area for YouTube controls (mobile: h-12, desktop: h-16) */}
          <div className="absolute bottom-0 left-0 w-full h-12 md:h-16 pointer-events-none z-20" />
        </div>
      )}
    </div>
  );
};

export default Videobcg;
