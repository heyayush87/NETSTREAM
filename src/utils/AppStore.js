import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./UserSlice";
import moviesReducer from "./movieSlice";
import GptReducer from "./GptSlice";
import ConfigReducer from "./ConfigSlice";

const AppStore = configureStore({
  reducer: {
    user: userReducer,
    movies: moviesReducer,
    Gpt: GptReducer,
    Config: ConfigReducer,
  },
});
export default AppStore;
