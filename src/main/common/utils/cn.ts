import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// clsx for conditional joining + tailwind-merge so that the LAST conflicting
// utility wins (e.g. a caller's `w-28`/`px-2.5` overrides the component's
// default `w-full`/`px-3`), matching the intuitive className override order.
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
