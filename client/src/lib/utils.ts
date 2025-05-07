import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM d, yyyy");
}

export function getInitials(name: string): string {
  if (!name) return "";
  
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function downloadAsPDF(content: any, filename: string) {
  // In a real implementation, this would use a library like jsPDF
  // to convert the content to a PDF and trigger a download
  console.log("Downloading as PDF:", content, filename);
  alert("PDF download functionality would be implemented here with jsPDF");
}

export function generateShareableLink(boardId: string): string {
  // In a real implementation, this would generate a unique shareable link
  const domains = process.env.REPLIT_DOMAINS?.split(",") || ["localhost:3000"];
  const domain = domains[0];
  return `https://${domain}/shared/${boardId}`;
}

export const priorityColors = {
  high: "text-red-600 bg-red-100",
  medium: "text-amber-600 bg-amber-100",
  low: "text-green-600 bg-green-100",
};

export const statusColors = {
  todo: "bg-blue-500",
  inprogress: "bg-amber-500",
  completed: "bg-green-500",
};
