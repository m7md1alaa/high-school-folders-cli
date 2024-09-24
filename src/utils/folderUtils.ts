import { checkbox } from "@inquirer/prompts";
import fs from "fs-extra";
import path from "path";

export async function createFolder(folderPath: fs.PathLike) {
  if (!fs.existsSync(folderPath)) {
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

export function getSemesterName(semester: string, language: string) {
  if (language === "ar") {
    const arabicSemesters = ["الترم الأول", "الترم الثاني", "الترم الثالث"];
    return arabicSemesters[parseInt(semester) - 1] || `الترم ${semester}`;
  }
  return `Semester-${semester}`;
}

export async function getAdditionalFolders(language: string) {
  const folderChoices = [
    { name: "Study Materials", value: language === "ar" ? "مواد دراسية" : "Study Materials" },
    { name: "Projects & Research", value: language === "ar" ? "مشاريع والأبحاث" : "Projects & Research" },
    { name: "Presentations", value: language === "ar" ? "العروض التقديمية" : "Presentations" },
    { name: "Exams", value: language === "ar" ? "الاختبارات" : "Exams" },
    { name: "General", value: language === "ar" ? "عام" : "General" },
  ];

  const selectedFolders = await checkbox({
    message: "Select additional folders:",
    choices: folderChoices,
  });

  return selectedFolders;
}