import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeDate(date: any, formatStr: string = "MMM dd, yyyy") {
    if (date === null || date === undefined || date === "") return "N/A";
    
    try {
        let dateObj: Date;
        
        if (date instanceof Date) {
            dateObj = date;
        } else {
            const numericDate = Number(date);
            // Treat as timestamp if it's a number/numeric string, has at least 10 digits (seconds), and no dashes (to avoid matching YYYY-MM-DD)
            if (!isNaN(numericDate) && String(date).length >= 10 && !String(date).includes('-')) {
                dateObj = new Date(numericDate);
            } else {
                dateObj = new Date(date);
            }
        }
        
        if (!isValid(dateObj) || isNaN(dateObj.getTime())) {
            return "N/A";
        }
        
        return format(dateObj, formatStr);
    } catch (e) {
        console.error("safeDate parsing error for value:", date, e);
        return "N/A";
    }
}
