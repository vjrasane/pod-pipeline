import { entries } from "lodash/fp";

export const titlePrompt = (prompt: string, maxWords: number) => `
Given the following prompt for an AI generated image: "${prompt}" write a description for the image to be sold on a stock image marketplace.

 - Do not reference a specific title for the image. Only describe it.
 - Do not mention aspect ratio or other attributes related to the size of the image.
 - Do not name any artists or styles as inspiration
 - Do not mention any camera settings, focus, lense sizes or brands
 - Avoid non-english words or extremely uncommon words.

Focus on the subject of the image, it should be clearly mentioned in the description and preferably in the first few words, if it can be determined from the prompt. Avoid articles "a" and "an", but use "the" where applicable.

If the subject cannot be easily determined, do not guess. Instead, focus on other aspects of the prompt such as style, theme, setting or athmosphere, but again do not guess if something is not certain.
Ignore everything else in the prompt. Leave out any words that are clearly disconnected from the general theme of the photo, even if they are directly mentioned in the prompt.

Ignore any arguments that start with double dashes in the prompt as well as the values that follow them.

As an example, an image of business people overlaid on a city office building could have the following description:

"Double exposure image of many business people conference group meeting on city office building in background showing partnership success of business deal. Concept of teamwork, trust and agreement."

Or an image with a cybersecurity professional working on their laptop could have the following description:

"Cybersecurity global network security and technology concept, Businessman use smartphone and laptop security encryption to manage important documents safely online and secure storage"

Or an image of hands holding a tree sprout in sunshine could have the following description:

"environment Earth Day In the hands of trees growing seedlings. Bokeh green Background Female hand holding tree on nature field grass Forest conservation"

Or an image of a voter dropping their ballot in a voting box could have the following description:

"Man Voter Putting Ballot Into Voting box. Democracy Freedom Concept Near Blue Wall"

The description can be at most 200 characters in length and a maximum of ${maxWords} words.
`;

export const keywordsPrompt = `
Come up with keywords for the image based on the previous prompt and title.

The keywords should vary in length. Short ones should focus on general and vague aspects of the image. Long ones should focus on the details.

Continue using language that has a higher chance of selling stock images and ranks well in search engines, but keep it descriptive rather than speculative.
Do not use words directly related to stock images, marketing or advertisements unless they are directly related to the image prompt or title.

If possible, use words from the title in the keywords. Avoid repeating words within the keywords, but make sure the most relevant words are present as short keywords.

Keywords should be 1-3 words in length.
There must be at least 5 keywords and a maximum of 49 keywords.
Sort the keywords in order of relevance.

Give the keywords as a comma separated list.
`;

export const CATEGORIES = {
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

export const categoryPrompt = `
From the following categories, choose the most suitable one for the image:

${entries(CATEGORIES)
  .map(([num, name]) => `${num}. ${name}`)
  .join("\n")}

Give only the number of the category
`;
