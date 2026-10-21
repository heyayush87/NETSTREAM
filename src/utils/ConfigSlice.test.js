import reducer, { setRegion } from "./ConfigSlice";

test("region defaults to IN and only accepts ISO country codes", () => {
  let s = reducer(undefined, { type: "init" });
  expect(s.region).toBe("IN");
  s = reducer(s, setRegion("US"));
  expect(s.region).toBe("US");
  s = reducer(s, setRegion("usa"));
  expect(s.region).toBe("US");
});
