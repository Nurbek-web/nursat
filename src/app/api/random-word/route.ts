import { NextResponse } from "next/server";
import { Etymology } from "@/types";

// Sample SAT vocabulary words with etymology
const satWords: Etymology[] = [
  {
    word: "deconstruct",
    definition: "To break down into constituent parts; to analyze critically",
    roots: [
      {
        root: "de-",
        origin: "Latin",
        meaning: "down, off, away",
      },
      {
        root: "construct",
        origin: "Latin",
        meaning: "to build, to pile up",
      },
    ],
    usage:
      "The literary critic deconstructed the novel to reveal its underlying themes.",
  },
  {
    word: "benevolent",
    definition: "Kind, generous, and caring about others",
    roots: [
      {
        root: "bene-",
        origin: "Latin",
        meaning: "good, well",
      },
      {
        root: "vol",
        origin: "Latin",
        meaning: "to wish",
      },
    ],
    usage:
      "The benevolent donor provided funds for the new children's hospital.",
  },
  {
    word: "metamorphosis",
    definition: "A complete change of physical form or substance",
    roots: [
      {
        root: "meta-",
        origin: "Greek",
        meaning: "change, beyond",
      },
      {
        root: "morph",
        origin: "Greek",
        meaning: "form, shape",
      },
    ],
    usage:
      "The caterpillar's metamorphosis into a butterfly is a remarkable process.",
  },
  {
    word: "circumnavigate",
    definition: "To travel all the way around something, especially by ship",
    roots: [
      {
        root: "circum-",
        origin: "Latin",
        meaning: "around",
      },
      {
        root: "navig",
        origin: "Latin",
        meaning: "to sail",
      },
    ],
    usage: "Magellan's expedition was the first to circumnavigate the globe.",
  },
];

export async function GET() {
  // Return a random word from the list
  const randomWord = satWords[Math.floor(Math.random() * satWords.length)];
  return NextResponse.json(randomWord);
}
