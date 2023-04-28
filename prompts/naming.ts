
export default (filename: string, maxWords: number) => `
Given the following filename of an image: '${filename}', write a short description up to ${maxWords} words.

Treat underscores as spaces. The first word is a username, ignore it. Ignore any words that seem like random identifiers.

Focus on the subject. It should be mentioned in the first few words. Avoid articles "a" and "an", but use "the" where applicable. 
The remainder of the description should give more details around the subject, the setting and the athmosphere of the image, but only if there is enough information in the filename to draw from. Leave the description short if uncertain.
`