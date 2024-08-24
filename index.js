#!/usr/bin/env node

import { input, select, checkbox } from "@inquirer/prompts";
import fs from "fs";
import path from "path";
import os from "os";
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

async function getAdditionalFolders(language) {
  const folderChoices = [
    {
      name: "Projects & Research",
      value: language === 'ar' ? "المشاريع والأبحاث" : "Projects & Research",
    },
    {
      name: "Presentations",
      value: language === 'ar' ? "العروض التقديمية" : "Presentations",
    },
    {
      name: "Study Materials",
      value: language === 'ar' ? "المواد الدراسية" : "Study Materials",
    },
    {
      name: "Exams",
      value: language === 'ar' ? "الاختبارات" : "Exams",
    },
    {
      name: "General (Calendar & Deadlines, etc.)",
      value: language === 'ar' ? "عام" : "General",
    },
  ];

  return checkbox({
    message: "Select additional folders to create:",
    choices: folderChoices,
  });
}

function getSemesterName(semester, language) {
  if (language === 'ar') {
    const arabicSemesters = ['الترم الأول', 'الترم الثاني', 'الترم الثالث'];
    return arabicSemesters[semester - 1] || `الترم ${semester}`;
  }
  return `Semester_${semester}`;
}

function createAdditionalFolders(basePath, additionalFolders, language) {
  additionalFolders.forEach(folder => {
    if (folder === "عام" || folder === "General") {
      const generalPath = path.join(basePath, folder);
      createFolder(generalPath);
      createFolder(path.join(generalPath, language === 'ar' ? "التقويم والمواعيد النهائية" : "Calendar & Deadlines"));
    }
  });
}

// Function to create the folder structure
function createSchoolFolders(
  baseDirectory,
  year,
  highSchoolYear,
  track,
  language,
  additionalFolders
) {
  const yearPath = path.join(baseDirectory, year, highSchoolYear);
  createFolder(yearPath);

  const subjectsForYear = subjectsByTrack[highSchoolYear];
  const subjectsForTrack = track ? subjectsForYear[track] : subjectsForYear;

  createAdditionalFolders(yearPath, additionalFolders, language);

  Object.keys(subjectsForTrack).forEach((semester, index) => {
    const semesterPath = path.join(yearPath, getSemesterName(index + 1, language));
    createFolder(semesterPath);

    subjectsForTrack[semester].forEach((subject) => {
      const subjectName = subject[language];
      const subjectPath = path.join(semesterPath, subjectName.trim());
      createFolder(subjectPath);

      additionalFolders.forEach((folder) => {
        if (folder !== "عام" && folder !== "General") {
          createFolder(path.join(subjectPath, folder));
        }
      });
    });
  });
}

function createUniversityFolders(
  baseDirectory,
  year,
  semesterCount,
  subjects,
  additionalFolders,
  language
) {
  const yearPath = path.join(baseDirectory, year);
  createFolder(yearPath);

  createAdditionalFolders(yearPath, additionalFolders, language);

  for (let i = 1; i <= semesterCount; i++) {
    const semesterPath = path.join(yearPath, getSemesterName(i, language));
    createFolder(semesterPath);

    subjects.forEach((subject) => {
      const subjectPath = path.join(semesterPath, subject.trim());
      createFolder(subjectPath);

      additionalFolders.forEach((folder) => {
        if (folder !== "عام" && folder !== "General") {
          createFolder(path.join(subjectPath, folder));
        }
      });
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
    default: path.join(os.homedir(), "Desktop"),
  });

  const additionalFolders = await getAdditionalFolders(language);

  createSchoolFolders(
    directory,
    schoolYear,
    highSchoolYear,
    highSchoolTrack,
    language,
    additionalFolders
  );
}

async function handleUniversity() {
  const language = await select({
    message: "Select your folders language:",
    choices: [
      { name: "English", value: "en" },
      { name: "Arabic", value: "ar" },
    ],
  });

  const year = await input({
    message: "Enter the university year (e.g., 2023-2024):",
    validate: (input) => {
      const regex = /^(20\d{2})-(20\d{2})$/;
      if (!regex.test(input)) {
        return "Please enter a valid Gregorian year range (e.g., 2023-2024).";
      }
      const [startYear, endYear] = input.split("-").map(Number);
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
    default: path.join(os.homedir(), "Desktop"),
  });

  const additionalFolders = await getAdditionalFolders(language);

  createUniversityFolders(
    directory,
    year,
    semesterCount,
    subjects,
    additionalFolders,
    language
  );
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