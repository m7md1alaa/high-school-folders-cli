#!/usr/bin/env node

import { input, select } from "@inquirer/prompts";
import fs from "fs";
import path from "path";
import { subjectsByTrack } from "./Subjects.js";
// Define subjects for each track, year, and semester

// Function to create folders
function createFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Folder created: ${folderPath}`);
  } else {
    console.log(`Folder already exists: ${folderPath}`);
  }
}

// Function to create the folder structure
function createSchoolFolders(baseDirectory, year, highSchoolYear, track, language) {
  const yearPath = path.join(baseDirectory, year, highSchoolYear);
  createFolder(yearPath);

  const subjectsForYear = subjectsByTrack[highSchoolYear];
  const subjectsForTrack = track ? subjectsForYear[track] : subjectsForYear;

  Object.keys(subjectsForTrack).forEach((semester) => {
    const semesterPath = path.join(yearPath, semester);
    createFolder(semesterPath);

    subjectsForTrack[semester].forEach((subject) => {
      const subjectName = subject[language]; // Choose the correct language
      const subjectPath = path.join(semesterPath, subjectName.trim());
      createFolder(subjectPath);
    });
  });
}


async function run() {
  // Language selection
  const language = await select({
    message: "Select your language:",
    choices: [
      { name: "English", value: "en" },
      { name: "Arabic", value: "ar" },
    ],
  });

  // Hijri school year input
  const schoolYearMessage = "Enter the school year (e.g., 1446-1447):";

  const schoolYear = await input({
    message: schoolYearMessage,
    validate: (input) => {
      const regex = /^\d{4}-\d{4}$/;
      return regex.test(input)
        ? true
        : "Please enter a valid Hijri year range (e.g., 1446-1447).";
    },
  });

  // High school year selection
  const highSchoolYearMessage = "What's the high school year?";

  const highSchoolYear = await select({
    message: highSchoolYearMessage,
    choices: [
      { name: "Shared first year", value: "first" },
      { name: "Second year", value: "second" },
      { name: "Third year", value: "third" },
    ],
  });

  let highSchoolTrack = null;

  // Conditionally ask for high school track
  if (highSchoolYear === "second" || highSchoolYear === "third") {
    const trackMessage = "Select high school track:";

    highSchoolTrack = await select({
      message: trackMessage,
      choices: [
        { name: "General track", value: "general" },
        { name: "Computer science and engineering", value: "cs" },
        { name: "Health and life", value: "health" },
        { name: "Business administration", value: "business" },
        { name: "Shariah track", value: "shariah" },
      ],
    });
  }

  const directoryMessage = "Enter the base directory where folders will be created:";

  const directory = await input({ message: directoryMessage, default: "." });

  // Create the folder structure with the chosen language
  createSchoolFolders(directory, schoolYear, highSchoolYear, highSchoolTrack, language);

  console.log("Folders created successfully.");
}

run();
