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
      name: language === "ar" ? "المشاريع والأبحاث" : "Projects & Research",
      value: "projects-research",
    },
    {
      name: language === "ar" ? "العروض التقديمية" : "Presentations",
      value: "presentations",
    },
    {
      name: language === "ar" ? "المواد الدراسية" : "Study Materials",
      value: "study-materials",
    },
    {
      name: language === "ar" ? "الاختبارات" : "Exams",
      value: "exams",
    },
    {
      name:
        language === "ar"
          ? "عام (التقويم والمواعيد النهائية، إلخ)"
          : "General (Calendar & Deadlines, etc.)",
      value: "general",
    },
  ];

  return checkbox({
    message:
      language === "ar"
        ? "حدد المجلدات الإضافية المراد إنشاؤها:"
        : "Select additional folders to create:",
    choices: folderChoices,
  });
}

function createAdditionalFolders(basePath, additionalFolders, language) {
  additionalFolders.forEach((folder) => {
    if (folder === "general") {
      const generalPath = path.join(
        basePath,
        language === "ar" ? "عام" : "General"
      );
      createFolder(generalPath);
      createFolder(
        path.join(
          generalPath,
          language === "ar"
            ? "التقويم والمواعيد النهائية"
            : "Calendar & Deadlines"
        )
      );
    } else {
      const folderName = {
        "projects-research":
          language === "ar" ? "المشاريع والأبحاث" : "Projects & Research",
        presentations: language === "ar" ? "العروض التقديمية" : "Presentations",
        "study-materials":
          language === "ar" ? "المواد الدراسية" : "Study Materials",
        exams: language === "ar" ? "الاختبارات" : "Exams",
      }[folder];
      createFolder(path.join(basePath, folderName));
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

  Object.keys(subjectsForTrack).forEach((semester) => {
    const semesterPath = path.join(yearPath, semester);
    createFolder(semesterPath);

    subjectsForTrack[semester].forEach((subject) => {
      const subjectName = subject[language]; // Choose the correct language
      const subjectPath = path.join(semesterPath, subjectName.trim());
      createFolder(subjectPath);

      additionalFolders.forEach((folder) => {
        if (folder !== "general") {
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
    const semesterPath = path.join(yearPath, `Semester_${i}`);
    createFolder(semesterPath);

    subjects.forEach((subject) => {
      const subjectPath = path.join(semesterPath, subject.trim());
      createFolder(subjectPath);

      additionalFolders.forEach((folder) => {
        if (folder !== "general") {
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
