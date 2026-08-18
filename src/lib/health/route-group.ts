export type StatusClass = "2xx" | "4xx" | "5xx" | "other";

export function routeGroupFromPath(pathname: string): string {
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return "";
  }

  if (pathname.startsWith("/api/")) {
    const segments = pathname.split("/").filter(Boolean);
    const apiSegment = segments[1];
    if (!apiSegment) {
      return "/api/";
    }
    return `/api/${apiSegment}`;
  }

  return "/";
}

export function statusClassFromStatus(status: number): StatusClass {
  if (status >= 200 && status < 300) {
    return "2xx";
  }
  if (status >= 400 && status < 500) {
    return "4xx";
  }
  if (status >= 500 && status < 600) {
    return "5xx";
  }
  return "other";
}

export function truncateToMinute(date: Date): Date {
  const truncated = new Date(date);
  truncated.setSeconds(0, 0);
  return truncated;
}
