import React from "react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { addPopularMovies } from "../utils/movieSlice";
import { API_OPTIONS } from "../utils/constant";

const UsePopularMovies = () => {
  const dispatch = useDispatch();
  async function getdata() {
    try {
      const response = await fetch(
        "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
        API_OPTIONS
      );
      if (!response.ok) {
        throw new Error(`From popular Movies Api,${response.status}`);
      }
      const data = await response.json();
      dispatch(addPopularMovies(data.results));
      // console.log(data);
    } catch (error) {
      console.error(error);
    }
  }
  useEffect(() => {
    getdata();
  }, []);
};

export default UsePopularMovies;
