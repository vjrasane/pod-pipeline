export const paintingNaming = (description: string) => `
given the following art description:

"${description}"

can you write a title for the art piece in the following format:
Vintage {subject} Painting, {subject} Art Print, {subject} Wall Art, Printable Digital Download

each subject can be a a couple of words long and should match the description as closly as possible
use different subjects for each occurence so that words are not repeated
`;

export const paintingDescription = `
write a description for the same piece of art in the following formula:

Write two sentences:

The first sentence should describe what the art depicts and how it would look and feel in the place it would be appropriate. For example:

'This vintage {subject description of a few words} art piece will {describe effect and feel} any {place where displayed} with its {overall feel of the art piece}.'

The second sentence should expand on this and give one or two examples of real life places where to display this art piece and end with a slightly grandeur statement about its importance, elegance and how iconic it is. For example:

'This antique {subject description} print wall art is perfect for {place where displayed} spaces with a bold elegance that makes it an iconic centerpiece for you.'

When describing the art piece do not mention any names or explicit painting styles.

End the description with a comma separated list of ten of the most relevantn long tail keywords, including the ones in the title. Include these exact long tail keywords in the list:
Country Oil Painting, Rustic Landscape Art Print, Farmhouse Art Decor, Printable Wall Art, Instant Digital Download
`;

export const paintingSection = (sections: string[]) => `
consider an online shop where a print of this art piece is sold. what would be a suitable category under which this piece and similar pieces would be grouped.

it makes sense to be quite general, but most of the prints in this shop are related to nature and countryside, so try to find some defining characteristic by which
to differentiate this piece from others like it.${
  sections.length
    ? `
if the piece would fit under any of the following categories, choose one of them:
${sections.join("\n")}`
    : ""
}

respond with just the name of the category
`;

export const paintingTags = `
downloadable art
digital art print
digital download
digital wall art
bedroom wall decor
downloadable print
ai generated art
cottage art print
vintage art print
living room wall art
farmhouse wall decor
cottage print
countryside print
`;
