/** Markdown heading that starts the screen-only booking footer on the service schedule page. */
export const SERVICE_SCHEDULE_BOOK_SECTION_MARKER = "## Book at Auto Galaxy";

export function splitServiceScheduleContent(content: string): {
  main: string;
  bookSection: string | null;
} {
  const index = content.indexOf(SERVICE_SCHEDULE_BOOK_SECTION_MARKER);
  if (index === -1) {
    return { main: content, bookSection: null };
  }

  return {
    main: content.slice(0, index).replace(/\n---\n?\s*$/, "").trimEnd(),
    bookSection: content.slice(index).trim(),
  };
}
