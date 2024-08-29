#!/usr/bin/env node
import { Command } from "commander";
import { input, select, checkbox } from "@inquirer/prompts";
import fs from "fs";
import path from "path";
import os from "os";
import { subjectsByTrack } from "./Subjects.js";

const program = new Command();

program
  .version("1.0.0")
  .description("CLI tool for creating folders for school or university")
  .option("-l, --language <lang>", "Set the language (en/ar)", "en")
  .option("-o, --output <directory>", "Set the output directory", process.cwd())
  .option(
    "-y, --year <year>",
    "Set the academic year (e.g., 2023-2024 or 1446-1447)"
  )
  .option(
    "-e, --education-type <type>",
    "Set the education type (university/school)"
  )
  .option(
    "-hy, --high-school-year <year>",
    "Set the high school year (first/second/third)"
  )
  .option(
    "-t, --track <track>",
    "Set the high school track (general/cs/health/business/shariah)"
  )
  .option(
    "-s, --semesters <count>",
    "Set the number of semesters for university (2/3)",
    "2"
  )
  .option(
    "-a, --additional-folders <folders>",
    "Comma-separated list of additional folders to create"
  )
  .option("-q, --quiet", "Run in quiet mode (suppress console output)")
  .option("-f, --force", "Force overwrite existing folders")
  .option("--edit", "Edit existing folder structure")
  .parse(process.argv);

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
      value: language === "ar" ? "المشاريع والأبحاث" : "Projects & Research",
    },
    {
      name: "Presentations",
      value: language === "ar" ? "العروض التقديمية" : "Presentations",
    },
    {
      name: "Study Materials",
      value: language === "ar" ? "المواد الدراسية" : "Study Materials",
    },
    {
      name: "Exams",
      value: language === "ar" ? "الاختبارات" : "Exams",
    },
    {
      name: "General (Calendar & Deadlines, etc.)",
      value: language === "ar" ? "عام" : "General",
    },
  ];

  return checkbox({
    message: "Select optional folders to create within each subject folder for better organization:",
    choices: folderChoices,
  });
}

function getSemesterName(semester, language) {
  if (language === "ar") {
    const arabicSemesters = ["الترم الأول", "الترم الثاني", "الترم الثالث"];
    return arabicSemesters[semester - 1] || `الترم ${semester}`;
  }
  return `Semester_${semester}`;
}

function createAdditionalFolders(basePath, additionalFolders, language) {
  additionalFolders.forEach((folder) => {
    if (folder === "عام" || folder === "General") {
      const generalPath = path.join(basePath, folder);
      createFolder(generalPath);
      createFolder(
        path.join(
          generalPath,
          language === "ar"
            ? "التقويم والمواعيد النهائية"
            : "Calendar & Deadlines"
        )
      );
    }
  });
}

function createSchoolFolders(
  baseDirectory,
  year,
  highSchoolYear,
  track,
  language,
  additionalFolders
) {
  const yearName = language === "ar" ? getArabicYearName(highSchoolYear) : highSchoolYear;
  const rootFolderName = `${yearName} ${year}`;
  const rootPath = path.join(baseDirectory, rootFolderName);
  createFolder(rootPath);

  const subjectsForYear = subjectsByTrack[highSchoolYear];
  const subjectsForTrack = track ? subjectsForYear[track] : subjectsForYear;

  createAdditionalFolders(rootPath, additionalFolders, language);

  Object.keys(subjectsForTrack).forEach((semester, index) => {
    const semesterPath = path.join(
      rootPath,
      getSemesterName(index + 1, language)
    );
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

function getArabicYearName(year) {
  const arabicYears = {
    first: "أول ثانوي",
    second: "ثاني ثانوي",
    third: "ثالث ثانوي"
  };
  return arabicYears[year] || year;
}

function createUniversityFolders(
  baseDirectory,
  year,
  semesterCount,
  semesters,
  additionalFolders,
  language
) {
  const yearPath = path.join(baseDirectory, year);
  createFolder(yearPath);

  createAdditionalFolders(yearPath, additionalFolders, language);

  for (let i = 0; i < semesterCount; i++) {
    const semesterPath = path.join(yearPath, getSemesterName(i + 1, language));
    createFolder(semesterPath);

    semesters[i].forEach((subject) => {
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

async function handleHighSchool(language) {
  const schoolYear = await input({
    message: "Enter the school year (e.g., 1445-1446):",
    validate: (input) => {
      const regex = /^\d{4}-\d{4}$/;
      return regex.test(input)
        ? true
        : "Please enter a valid Hijri year range (e.g., 1445-1446).";
    },
  });

  const highSchoolYear = await select({
    message: "What's the high school year?",
    choices: [
      { name: "First year", value: "first" },
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

  const additionalFolders = await getAdditionalFolders(language);

  const directory = await input({
    message: "Enter the base directory where folders will be created:",
    default: path.join(os.homedir(), "Desktop"),
  });

  createSchoolFolders(
    directory,
    schoolYear,
    highSchoolYear,
    highSchoolTrack,
    language,
    additionalFolders
  );
}

async function handleUniversity(language) {
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

  const semesters = [];

  for (let i = 1; i <= semesterCount; i++) {
    console.log(`\nEnter subjects for ${getSemesterName(i, language)}:`);
    const subjects = [];
    let addMore = true;

    while (addMore) {
      const subjectName = await input({
        message: `Enter subject name for ${getSemesterName(i, language)}:`,
      });
      subjects.push(subjectName);

      addMore = await select({
        message: `Do you want to add another subject to ${getSemesterName(i, language)}?`,
        choices: [
          { name: "Yes", value: true },
          { name: "No", value: false },
        ],
      });
    }

    semesters.push(subjects);
  }

  const additionalFolders = await getAdditionalFolders(language);

  const directory = await input({
    message: "Enter the base directory where folders will be created:",
    default: path.join(os.homedir(), "Desktop"),
  });

  createUniversityFolders(
    directory,
    year,
    semesterCount,
    semesters,
    additionalFolders,
    language
  );
}

async function editFolderStructure() {
  const baseDirectory = await input({
    message:
      "Enter the base directory of the folder structure you want to edit:",
    default: path.join(os.homedir(), "Desktop"),
  });

  if (!fs.existsSync(baseDirectory)) {
    console.log("The specified directory does not exist.");
    return;
  }

  const semesterFolders = fs
    .readdirSync(baseDirectory)
    .filter(
      (folder) => folder.startsWith("Semester_") || folder.startsWith("الترم")
    );

  if (semesterFolders.length === 0) {
    console.log("No semester folders found in the specified directory.");
    const createNew = await select({
      message: "Would you like to create a new semester folder?",
      choices: [
        { name: "Yes", value: true },
        { name: "No", value: false },
      ],
    });

    if (createNew) {
      const newSemesterName = await input({
        message: "Enter the name of the new semester folder:",
        default: "Semester_1",
      });
      fs.mkdirSync(path.join(baseDirectory, newSemesterName));
      console.log(`Created new semester folder: ${newSemesterName}`);
      semesterFolders.push(newSemesterName);
    } else {
      console.log("Operation cancelled.");
      return;
    }
  }

  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Add a new subject", value: "add_subject" },
      { name: "Remove a subject", value: "remove_subject" },
    ],
  });

  switch (action) {
    case "add_subject":
      await addNewSubject(baseDirectory, semesterFolders);
      break;
    case "remove_subject":
      await removeSubject(baseDirectory, semesterFolders);
      break;
  }
}

async function addNewSubject(baseDirectory, semesterFolders) {
  const semester = await select({
    message: "Select the semester to add the subject to:",
    choices: semesterFolders.map((folder) => ({ name: folder, value: folder })),
  });

  const newSubject = await input({
    message: "Enter the name of the new subject:",
  });

  const subjectPath = path.join(baseDirectory, semester, newSubject);
  createFolder(subjectPath);

  console.log(`Added new subject: ${newSubject} to ${semester}`);
}

async function removeSubject(baseDirectory, semesterFolders) {
  const semester = await select({
    message: "Select the semester to remove a subject from:",
    choices: semesterFolders.map((folder) => ({ name: folder, value: folder })),
  });

  const subjects = fs.readdirSync(path.join(baseDirectory, semester));

  if (subjects.length === 0) {
    console.log(`No subjects found in ${semester}.`);
    return;
  }

  const subjectToRemove = await select({
    message: "Select the subject to remove:",
    choices: subjects.map((subject) => ({ name: subject, value: subject })),
  });

  fs.rmdirSync(path.join(baseDirectory, semester, subjectToRemove), {
    recursive: true,
  });
  console.log(`Removed subject: ${subjectToRemove} from ${semester}`);
}

async function run() {
  const options = program.opts();

  if (options.edit) {
    await editFolderStructure();
  } else {
    const educationType = await select({
      message: "What type of educational institution are you in?",
      choices: [
        { name: "University", value: "university" },
        { name: "High School", value: "highschool" },
      ],
    });

    const language = await select({
      message: "Select your folders language:",
      choices: [
        { name: "English", value: "en" },
        { name: "Arabic", value: "ar" },
      ],
    });

    if (educationType === "university") {
      await handleUniversity(language);
    } else {
      await handleHighSchool(language);
    }
  }

  if (!options.quiet) {
    console.log("Operation completed successfully.");
  }
}

run();
