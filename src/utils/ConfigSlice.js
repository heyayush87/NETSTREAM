import { createSlice } from "@reduxjs/toolkit";

const ConfigSlice = createSlice({
  name: "Config",
  initialState: {
    lang: "en",
    region: "IN", // ISO 3166-1; drives streaming availability
  },
  reducers: {
    changeLanguage: (state, action) => {
      state.lang = action.payload;
    },
    setRegion: (state, action) => {
      if (/^[A-Z]{2}$/.test(action.payload)) state.region = action.payload;
    },
  },
});
export const { changeLanguage, setRegion } = ConfigSlice.actions;
export default ConfigSlice.reducer;
