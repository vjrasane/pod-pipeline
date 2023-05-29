import { readFile, writeFile } from "fs";
import { promisify } from "util";
import { PDFDocument, PDFName, PDFPage, PDFString, rgb } from "pdf-lib";

type Rectangle = readonly [number, number, number, number];

const createPageLinkAnnotation = (
  page: PDFPage,
  uri: string,
  rectangle: readonly [number, number, number, number]
) =>
  page.doc.context.register(
    page.doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: rectangle,
      Border: [0, 0, 2],
      C: [0, 0, 1],
      A: {
        Type: "Action",
        S: "URI",
        URI: PDFString.of(uri),
      },
    })
  );

export const getPageDimensions = async (input: string) => {
  const contents = await promisify(readFile)(input);
  const doc = await PDFDocument.load(contents);

  const [page] = doc.getPages();
  return [page.getWidth(), page.getHeight()];
};

export const addLinkToPdf = async (
  input: string,
  output: string,
  link: string,
  coordinates: Rectangle
) => {
  const contents = await promisify(readFile)(input);
  const doc = await PDFDocument.load(contents);

  const [page] = doc.getPages();

  page.node.set(
    PDFName.of("Annots"),
    doc.context.obj([createPageLinkAnnotation(page, link, coordinates)])
  );

  const pdfBytes = await doc.save();
  await promisify(writeFile)(output, pdfBytes);
  return output;
};
