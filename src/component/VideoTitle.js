const VideoTitle = ({ title, overview }) => {
  return (
    <>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

      {/* Content - now avoids the bottom control area */}
      <div className="absolute bottom-16 left-0 w-full z-20 px-4 sm:px-8 md:px-12 pb-6 text-white">
        <h1 className="text-xl sm:text-3xl md:text-5xl font-bold drop-shadow-md">
          {title}
        </h1>
        <p className="hidden md:block py-2 md:py-4 text-sm sm:text-base md:text-lg w-full md:w-2/5 lg:w-1/3">
          {overview}
        </p>

        {/* Buttons - positioned higher to avoid overlap */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="bg-white text-black py-2 md:py-3 px-6 md:px-10 text-sm md:text-lg rounded-lg hover:bg-opacity-80 transition font-semibold shadow">
            ▶️ Play
          </button>
          <button className="hidden md:inline-block bg-gray-500 text-white py-2 md:py-3 px-6 md:px-10 text-sm md:text-lg bg-opacity-60 rounded-lg transition font-semibold shadow">
            More Info
          </button>
        </div>
      </div>
    </>
  );
};

export default VideoTitle;