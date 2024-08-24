#!/usr/bin/env node

import { input, select } from "@inquirer/prompts";
import fs from "fs";
import path from "path";
import os from 'os';
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

function createUniversityFolders(baseDirectory, year, semesterCount, subjects) {
  const yearPath = path.join(baseDirectory, year);
  createFolder(yearPath);

  for (let i = 1; i <= semesterCount; i++) {
    const semesterPath = path.join(yearPath, `Semester_${i}`);
    createFolder(semesterPath);

    subjects.forEach(subject => {
      const subjectPath = path.join(semesterPath, subject.trim());
      createFolder(subjectPath);
    });
  }
}

async function handleHighSchool() {
  const language = await select({
    message: "Select your folders language:",
    choices: [
      { name: "English", value: "en" },
      { name: "Arabic", value: "ar" },
    ],
  });

  const schoolYear = await input({
    message: "Enter the school year (e.g., 1446-1447):",
    validate: (input) => {
      const regex = /^\d{4}-\d{4}$/;
      return regex.test(input)
        ? true
        : "Please enter a valid Hijri year range (e.g., 1446-1447).";
    },
  });

  const highSchoolYear = await select({
    message: "What's the high school year?",
    choices: [
      { name: "Shared first year", value: "first" },
      { name: "Second year", value: "second" },
      { name: "Third year", value: "third" },
    ],
  });

  let highSchoolTrack = null;

  if (highSchoolYear === "second" || highSchoolYear === "third") {
    highSchoolTrack = await select({
      message: "Select high school track:",
      choices: [
        { name: "General track", value: "general" },
        { name: "Computer science and engineering", value: "cs" },
        { name: "Health and life", value: "health" },
        { name: "Business administration", value: "business" },
        { name: "Shariah track", value: "shariah" },
      ],
    });
  }

  const directory = await input({
    message: "Enter the base directory where folders will be created:",
    default: path.join(os.homedir(), 'Desktop'),
  });

  createSchoolFolders(directory, schoolYear, highSchoolYear, highSchoolTrack, language);
}

async function handleUniversity() {
  const year = await input({
    message: "Enter the university year (e.g., 2023-2024):",
    validate: (input) => {
      const regex = /^(20\d{2})-(20\d{2})$/;
      if (!regex.test(input)) {
        return "Please enter a valid Gregorian year range (e.g., 2023-2024).";
      }
      const [startYear, endYear] = input.split('-').map(Number);
      if (endYear !== startYear + 1) {
        return "The end year should be exactly one year after the start year.";
      }
      return true;
    },
  });

  const semesterCount = await select({
    message: "How many semesters does your university have?",
    choices: [
      { name: "2 semesters", value: 2 },
      { name: "3 semesters", value: 3 },
    ],
  });

  const subjects = [];
  let addMore = true;

  while (addMore) {
    const subjectName = await input({
      message: "Enter the subject name:",
    });
    subjects.push(subjectName);

    addMore = await select({
      message: "Do you want to add another subject?",
      choices: [
        { name: "Yes", value: true },
        { name: "No", value: false },
      ],
    });
  }

  const directory = await input({
    message: "Enter the base directory where folders will be created:",
    default: path.join(os.homedir(), 'Desktop'),
  });

  createUniversityFolders(directory, year, semesterCount, subjects);
}

async function run() {
  const isUniversity = await select({
    message: "Are you a university student?",
    choices: [
      { name: "Yes", value: true },
      { name: "No", value: false },
    ],
  });

  if (isUniversity) {
    await handleUniversity();
  } else {
    await handleHighSchool();
  }

  console.log("Folders created successfully.");
}

run();