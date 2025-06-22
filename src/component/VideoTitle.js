const VideoTitle = ({ title, overview }) => {
  return (
    <>
      {/* Background Gradient (non-interactive) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

      {/* Foreground Content (interactive) */}
      <div className="absolute bottom-0 left-0 w-full z-20 px-4 sm:px-8 md:px-12 pb-6 sm:pb-10 md:pb-20 text-white">
        {/* Title and Overview — no need for pointer-events-none here */}
        <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold drop-shadow-md">
          {title}
        </h1>
        <p className="hidden md:block py-2 md:py-4 text-sm sm:text-base md:text-lg lg:text-xl w-full md:w-2/5 lg:w-1/3 xl:w-1/4">
          {overview}
        </p>

        {/* Buttons — interactive */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="bg-white text-black py-2 md:py-4 px-6 md:px-12 text-sm md:text-xl rounded-lg hover:bg-opacity-80 transition font-semibold shadow">
            ▶️ Play
          </button>
          <button className="hidden md:inline-block bg-gray-500 text-white py-2 md:py-4 px-6 md:px-12 text-sm md:text-xl bg-opacity-60 rounded-lg transition font-semibold shadow">
            More Info
          </button>
        </div>
      </div>
    </>
  );
};

export default VideoTitle;
