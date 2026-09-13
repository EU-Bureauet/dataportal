const DANISH_MEP_PHOTO_DIR = "/img/Danish_MEPs";

/**
 * Maps EP full_name strings to local Danish MEP photo filenames.
 * Example: "Morten LØKKEGAARD" -> "Morten Loekkegaard.jpg"
 */
export function toDanishMepLocalPhotoUrl(fullName: string, basePath: string): string {
  const normalised = fullName
    .split(" ")
    .map((part) => {
      return part
        .split("-")
        .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
        .join("-");
    })
    .join(" ");

  const ascii = normalised
    .replace(/Ø/g, "Oe")
    .replace(/ø/g, "oe")
    .replace(/Æ/g, "Ae")
    .replace(/æ/g, "ae")
    .replace(/Å/g, "Aa")
    .replace(/å/g, "aa");

  return `${basePath}${DANISH_MEP_PHOTO_DIR}/${encodeURIComponent(ascii)}.jpg`;
}
