import { createDefaultPreset } from "ts-jest";

/** @type {import("jest").Config} **/
export default {
  ...createDefaultPreset(),
  preset: "ts-jest",
};
