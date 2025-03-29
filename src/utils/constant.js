export const netflixlogo =
  "https://cdn.cookielaw.org/logos/dd6b162f-1a32-456a-9cfe-897231c7763c/4345ea78-053c-46d2-b11e-09adaef973dc/Netflix_Logo_PMS.png";

export const avtaar =
  "https://lh3.googleusercontent.com/ogw/AF2bZyh4S8n-MyamN3jl5bdR1Tw2AtDNf5ur1173v6-iiPyq4Q=s64-c-mo";

export const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.REACT_APP_TMDB_KEY}`,
  },
};

export const bglogo =
  "https://assets.nflxext.com/ffe/siteui/vlv3/fc164b4b-f085-44ee-bb7f-ec7df8539eff/d23a1608-7d90-4da1-93d6-bae2fe60a69b/IN-en-20230814-popsignuptwoweeks-perspective_alpha_website_large.jpg";

export const IMG_CDN_URL = "https://image.tmdb.org/t/p/w500";

export const Supported_Languages = [
  { identifiers: "en", name: "English" },
  { identifiers: "hindi", name: "Hindi" },
  { identifiers: "Spanish", name: "Spanish" },
];

// export const OPENAI_KEY = process.env.REACT_APP_OPENAI_KEY; // OpenAI API Key
export const Gemini_Key = process.env.REACT_APP_GEMINI_KEY; // Gemini API Key
