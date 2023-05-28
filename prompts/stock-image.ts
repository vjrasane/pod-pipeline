import { entries } from "lodash/fp";

export const titlePrompt = (prompt: string) => `
Given the following prompt for an AI generated image: "${prompt}" write a short description for the image to be sold on a stock image marketplace.
Describe the subject and action concisely, adding a few words about the setting, theme and athmosphere if applicable.

 - Do not reference a specific title for the image. Only describe it.
 - Do not mention aspect ratio or other attributes related to the size of the image.
 - Do not name any artists or styles as inspiration
 - Do not mention any camera settings, focus, lense sizes or brands
 - Avoid non-english words or extremely uncommon words.

The description can be at most 200 characters in length.
`;

export const keywordsPrompt = `
Come up with keywords for the image based on the previous prompt and title.

- Do not mention aspect ratio or other attributes related to the size of the image.
- Do not name any artists or styles as inspiration
- Do not mention any camera settings, focus, lense sizes or brands
- Avoid non-english words or extremely uncommon words.

The keywords should vary in length. Short ones should focus on general and vague aspects of the image. Long ones should focus on the details.

Continue using language that has a higher chance of selling stock images and ranks well in search engines, but keep it descriptive rather than speculative.
Do not use words directly related to stock images, marketing or advertisements unless they are directly related to the image prompt or title.

If possible, use words from the title in the keywords. Avoid repeating words within the keywords, but make sure the most relevant words are present as short keywords.

Keywords should be 1-3 words in length.
There must be at least 5 keywords and a maximum of 49 keywords.
Sort the keywords in order of relevance.

Give the keywords as a comma separated list.
`;

export const ADOBE_STOCK_CATEGORIES = {
  1: "Animals",
  2: "Buildings and Architecture",
  3: "Business",
  4: "Drinks",
  5: "The Environment",
  6: "States of Mind",
  7: "Food",
  8: "Graphic Resources",
  9: "Hobbies and Leisure",
  10: "Industry",
  11: "Landscapes",
  12: "Lifestyle",
  13: "People",
  14: "Plants and Flowers",
  15: "Culture and Religion",
  16: "Science",
  17: "Social Issues",
  18: "Sports",
  19: "Technology",
  20: "Transport",
  21: "Travel",
} as const;

export const SHUTTERSTOCK_CATEGORIES = [
  "Abstract",
  "Animals/Wildlife",
  "Arts",
  "Backgrounds/Textures",
  "Beauty/Fashion",
  "Buildings/Landmarks",
  "Business/Finance",
  "Celebrities",
  "Education",
  "Food and drink",
  "Healthcare/Medical",
  "Holidays",
  "Industrial",
  "Interiors",
  "Miscellaneous",
  "Nature",
  "Objects",
  "Parks/Outdoor",
  "People",
  "Religion",
  "Science",
  "Signs/Symbols",
  "Sports/Recreation",
  "Technology",
  "Transportation",
  "Vintage",
] as const;

export type ShutterstockCategory = (typeof SHUTTERSTOCK_CATEGORIES)[number];

export const adobeStockCategoryPrompt = `
From the following categories, choose the most suitable one for the image:

${entries(ADOBE_STOCK_CATEGORIES)
  .map(([num, name]) => `${num}. ${name}`)
  .join("\n")}

Give only the number of the category
`;

export const shutterstockCategoryPrompt = `
From the following categories, select one or two of the most suitable ones for the image:

${SHUTTERSTOCK_CATEGORIES.join("\n")}

Give only the names of the categories in order of importance, separated by commas.
`;
