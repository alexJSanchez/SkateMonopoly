// Photos for the board spaces, from src/assets/location_images.
// A file belongs to a space by its two-digit prefix: "06-shaw-millennium-canada.jpg"
// is space 6. Spaces without a file just get no image (the card shows an icon).
const files = import.meta.glob("../assets/location_images/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const bySpace = {};
for (const [path, url] of Object.entries(files)) {
  const match = path.match(/\/(\d{2})-[^/]*$/);
  if (match) bySpace[Number(match[1])] = url;
}

export const locationImage = (spaceIndex) => bySpace[spaceIndex] ?? null;
