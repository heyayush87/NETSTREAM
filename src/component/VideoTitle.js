const VideoTitle = ({ title, overview }) => {
  return (
    <div className="w-full pb-6 sm:pb-12 md:pb-20 px-2 sm:px-6 md:px-12 absolute bottom-0 left-0 text-white bg-gradient-to-r from-black/80 via-black/40 to-transparent z-20">
      <h1 className="text-lg sm:text-3xl md:text-5xl lg:text-6xl font-bold drop-shadow-md">
        {title}
      </h1>
      <p className="hidden md:inline-block py-2 md:py-4 text-base md:text-lg lg:text-xl w-full md:w-2/5 lg:w-1/3 xl:w-1/4">
        {overview}
      </p>
      <div className="my-4 md:m-0 flex flex-col sm:flex-row gap-3">
        <button className="bg-white text-black py-2 md:py-4 px-6 md:px-12 text-base md:text-xl rounded-lg hover:bg-opacity-80 transition font-semibold shadow">
          ▶️ Play
        </button>
        <button className="hidden md:inline-block mx-0 md:mx-2 bg-gray-500 text-white py-2 md:py-4 px-6 md:px-12 text-base md:text-xl bg-opacity-60 rounded-lg transition font-semibold shadow">
          More Info
        </button>
      </div>
    </div>
  );
};

export default VideoTitle;
