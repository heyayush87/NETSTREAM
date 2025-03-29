import { createSlice } from "@reduxjs/toolkit";

const UserSlice = createSlice({
  name: "user",
  initialState: null,
  reducers: {
    adduser: (state, action) => action.payload,
    removeuser: () => null,
  },
});

export const { adduser, removeuser } = UserSlice.actions;
export default UserSlice.reducer;
