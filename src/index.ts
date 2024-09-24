import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs, { existsSync, mkdir, readFile, writeFile } from "fs-extra";
import path from "path";
import os from "os";
import { subjectsByTrack } from "./constants/subjectsByTrack";
import { checkbox, input, select } from "@inquirer/prompts";
import { getAdditionalFolders, getSemesterName } from "./utils/folderUtils";

const program = new Command();

interface CliFlags {
  default: boolean;
}
interface CliResults {
  appName: string;
  flags: {
    arabic: boolean;
    default: boolean;
    educationType: boolean;
  };
  arabic?: boolean;
  default?: boolean;
  educationType?: boolean;
}

const defaultOptions: CliResults = {
  appName: "",
  flags: {
    arabic: true,
    default: false,
    educationType: false,
  },
};
async function createFolder(folderPath: string) {
  if (!existsSync(folderPath)) {
    try {
      await fs.mkdir(folderPath, { recursive: true });
      console.log(`Created folder: ${folderPath}`);
    } catch (error) {
      console.error(`Error creating folder ${folderPath}:`, error);
    }
  } else {
    console.log(`Folder already exists: ${folderPath}`);
  }
}

export const runCli = async (): Promise<CliResults> => {
  const cliResults = defaultOptions;
  program
    .version("1.0.0")
    .description("A CLI tool for creating folders for school or university")
    .argument(
      "[dir]",
      "The name of the application, as well as the name of the directory to create"
    )
    .option("-l, --language <lang>", "Set the language (en/ar)", "en")
    .option(
      "-o, --output <directory>",
      "Set the output directory",
      process.cwd()
    )
    .option(
      "-y, --default",
      "Bypass the CLI and use all default options to bootstrap a new t3-app",
      false
    )
    .option(
      "-y, --year <year>",
      "Set the academic year (e.g., 2024-2025 or 1446-1447)"
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

  return cliResults; // Ensure the function returns a value
};

async function createAdditionalFolders(
  basePath: string,
  additionalFolders: string[],
  language: string
) {
  for (const folder of additionalFolders) {
    const folderName = language === "ar" ? getArabicFolderName(folder) : folder;
    const folderPath = path.join(basePath, folderName);
    try {
      await mkdir(folderPath, { recursive: true });
      console.log(`Created folder: ${folderPath}`);
    } catch (error) {
      console.error(`Error creating folder ${folderPath}:`, error);
    }
  }
}

const arabicFolderNames: Record<string, string> = {
  "Study Materials": "مواد دراسية",
  "Projects & Research": "مشاريع والأبحاث",
  Presentations: "العروض التقديمية",
  Exams: "الاختبارات",
  General: "عام",
};

function getArabicFolderName(englishName: string) {
  return arabicFolderNames[englishName] || englishName;
}

async function createSchoolFolders(
  basePath: string,
  semesters: string | any[],
  additionalFolders: any[],
  language: string
) {
  const generalFolder = additionalFolders.find(
    (folder) => folder.toLowerCase() === "general"
  );
  if (generalFolder) {
    const generalFolderName =
      language === "ar" ? getArabicFolderName(generalFolder) : generalFolder;
    const generalFolderPath = path.join(basePath, generalFolderName);
    await createFolder(generalFolderPath);
  }
  for (let i = 0; i < semesters.length; i++) {
    const semesterPath = path.join(
      basePath,
      getSemesterName((i + 1).toString(), language)
    );
    await createFolder(semesterPath);

    for (const subject of semesters[i]) {
      const subjectPath = path.join(semesterPath, subject);
      await createFolder(subjectPath);

      // Create additional folders within each subject directory
      for (const folder of additionalFolders) {
        if (folder.toLowerCase() !== "general") {
          const folderName =
            language === "ar" ? getArabicFolderName(folder) : folder;
          const folderPath = path.join(subjectPath, folderName);
          await createFolder(folderPath);
        }
      }
    }
  }
}

function getArabicYearName(year: string | number) {
  const arabicYears = {
    first: "أول ثانوي",
    second: "ثاني ثانوي",
    third: "ثالث ثانوي",
  };
  return arabicYears[year.toString() as keyof typeof arabicYears] || year;
}

async function createUniversityFolders(
  baseDirectory: string,
  year: string,
  semesterCount: number,
  semesters: any[][],
  additionalFolders: any[],
  language: string
) {
  const yearPath = path.join(baseDirectory, year);
  createFolder(yearPath);

  await createAdditionalFolders(yearPath, additionalFolders, language);

  for (let i = 0; i < semesterCount; i++) {
    const semesterPath = path.join(
      yearPath,
      getSemesterName((i + 1).toString(), language)
    );
    createFolder(semesterPath);

    semesters[i].forEach((subject) => {
      const subjectPath = path.join(semesterPath, subject.trim());
      createFolder(subjectPath);

      additionalFolders.forEach((folder) => {
        if (folder !== "عام" && folder !== "General") {
          const folderName =
            language === "ar" ? getArabicFolderName(folder) : folder;
          createFolder(path.join(subjectPath, folderName));
        }
      });
    });
  }

  saveConfiguration(yearPath, {
    type: "university",
    year,
    semesterCount,
    semesters,
    additionalFolders,
    language,
  });
}

async function handleHighSchool(language: string) {
  const schoolYear = await input({
    message: "Enter the school year (e.g., 1445-1446):",
    validate: (input: string) => {
      const regex = /^(14\d{2})-(14\d{2})$/;
      if (!regex.test(input)) {
        return "Please enter a valid Hijri year range (e.g., 1445-1446).";
      }
      return true;
    },
  });

  const highSchoolYear = await select({
    message: "What's the high school year?",
    choices: [
      {
        name: "First year",
        value: "first",
      },
      {
        name: "Second year",
        value: "second",
      },
      {
        name: "Third year",
        value: "third",
      },
    ],
  });

  let highSchoolTrack = null;

  if (highSchoolYear === "second" || highSchoolYear === "third") {
    highSchoolTrack = await select({
      message: "Select high school track:",
      choices: [
        {
          name: "General track",
          value: "general",
        },
        {
          name: "Computer science",
          value: "cs",
        },
        {
          name: "Health and life",
          value: "health",
        },
        {
          name: "Business administration",
          value: "business",
        },
        {
          name: "Shariah track",
          value: "shariah",
        },
      ],
    });
  }

  const additionalFolders = await getAdditionalFolders(language);

  const directory = await input({
    message: "Enter the base directory where folders will be created:",
    default: path.join(os.homedir(), "Desktop"),
  });

  const semesters = [];
  for (let i = 1; i <= 3; i++) {
    console.log(
      `\nEnter subjects for ${getSemesterName(i.toFixed(), "semester")}:`
    );
    const subjects = [];
    let addMore = true;

    while (addMore) {
      const subjectName = await input({
        message: `Enter subject name for ${getSemesterName(
          i.toFixed(),
          "semester"
        )}:`,
      });
      subjects.push(subjectName);

      addMore = await select({
        message: `Do you want to add another subject to ${getSemesterName(
          i.toFixed(),
          "semester"
        )}:`,
        choices: [
          { name: "Yes", value: true },
          { name: "No", value: false },
        ],
      });
    }
    semesters.push(subjects);
  }

  await createSchoolFolders(directory, semesters, additionalFolders, language);

  saveConfiguration(directory, {
    type: "school",
    year: schoolYear,
    highSchoolYear,
    track: highSchoolTrack,
    language,
    additionalFolders,
  });
}

async function handleUniversity(language: string) {
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
    message: "Select the number of semesters:",
    choices: [
      { name: "2 semesters", value: 2 },
      { name: "3 semesters", value: 3 },
    ],
  });

  const semesters = [];
  for (let i = 1; i <= semesterCount; i++) {
    console.log(
      `\nEnter subjects for ${getSemesterName(i.toFixed(), "semester")}`
    );
    const subjects = [];
    let addMore = true;

    while (addMore) {
      const subjectName = await input({
        message: `Enter subject name for ${getSemesterName(
          i.toFixed(),
          "semester"
        )}:`,
      });
      subjects.push(subjectName);

      addMore = await select({
        message: `Do you want to add another subject to ${getSemesterName(
          i.toFixed(),
          "semester"
        )}?`,
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

  await createUniversityFolders(
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
    message: "Enter the full path of the folder structure you want to edit:",
    default: path.join(os.homedir(), "Desktop"),
  });

  if (!existsSync(baseDirectory)) {
    console.log("Error: The specified directory does not exist.");
    return;
  }

  const config = await readConfiguration(baseDirectory);

  if (!config) {
    console.log(
      "Error: No configuration found for this folder structure. Are you sure this is a folder created by this tool?"
    );
    return;
  }

  const semesterFolders = fs
    .readdirSync(baseDirectory)
    .filter(
      (folder) =>
        folder.startsWith("Semester_") ||
        folder.startsWith("الترم") ||
        /^(الترم الأول|الترم الثاني|الترم الثالث)$/.test(folder)
    );

  if (semesterFolders.length === 0) {
    console.log("No semester folders found in the directory.");
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
      await addNewSubject(baseDirectory, semesterFolders, config);
      break;
    case "remove_subject":
      await removeSubject(baseDirectory, semesterFolders);
      break;
  }

  // Save the updated configuration
  saveConfiguration(baseDirectory, config);
}

async function addNewSubject(
  baseDirectory: string,
  semesterFolders: any[],
  config: {
    additionalFolders: any[];
    language: string;
    type: string;
    semesters: any[];
  }
) {
  const semester = await select({
    message: "Select the semester to add the subject to:",
    choices: semesterFolders.map((folder) => ({ name: folder, value: folder })),
  });

  const newSubject = await input({
    message: "Enter the name of the new subject:",
  });

  const subjectPath = path.join(baseDirectory, semester, newSubject);
  createFolder(subjectPath);

  // Create additional folders within the subject folder
  config.additionalFolders.forEach((folder) => {
    if (folder !== "General") {
      const folderName =
        config.language === "ar" ? getArabicFolderName(folder) : folder;
      createFolder(path.join(subjectPath, folderName));
    }
  });

  console.log(`Added new subject: ${newSubject} to ${semester}`);

  // Update the configuration
  if (config.type === "university") {
    const semesterIndex = semesterFolders.indexOf(semester);
    if (!config.semesters) config.semesters = [];
    if (!config.semesters[semesterIndex]) config.semesters[semesterIndex] = [];
    config.semesters[semesterIndex].push(newSubject);
  } else {
    // For school, we might need to update the subjects based on the track and year
    // This part depends on how you've structured your school subjects
  }
}

async function removeSubject(baseDirectory: string, semesterFolders: any[]) {
  const semester = await select({
    message: "Select the semester to remove a subject from:",
    choices: semesterFolders.map((folder: any) => ({
      name: folder,
      value: folder,
    })),
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

async function saveConfiguration(
  folderPath: string,
  config: {
    type: string;
    year: string;
    semesterCount?: number;
    semesters?: any[][];
    additionalFolders: any[] | string[];
    language: string;
    highSchoolYear?: string;
    track?: string | null;
  }
) {
  const configPath = path.join(folderPath, ".school-folders-config.json");
  try {
    await writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`Configuration saved to: ${configPath}`);
  } catch (error: any) {
    console.error("Error saving configuration file:", error.message);
  }
}

async function readConfiguration(folderPath: string) {
  const configPath = path.join(folderPath, ".school-folders-config.json");
  if (existsSync(configPath)) {
    try {
      const configData = await readFile(configPath, "utf8");
      console.log(`Configuration read from: ${configPath}`);
      return JSON.parse(configData);
    } catch (error: any) {
      console.error("Error reading configuration file:", error.message);
      return null;
    }
  }
  console.log(`No configuration file found at: ${configPath}`);
  return null;
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
