import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-HTTPS contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand("copy");
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error("Failed to copy text:", error);
    return false;
  }
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");

  // Add country code if not present
  if (!phoneNumber.startsWith("+")) {
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
  }

  return phoneNumber;
};

export const validateTwilioAccountSid = (accountSid: string): boolean => {
  return accountSid.startsWith("AC") && accountSid.length === 34;
};

export const validateTwilioAuthToken = (authToken: string): boolean => {
  return authToken.length === 32;
};

export const maskSensitiveData = (
  data: string,
  visibleChars: number = 4,
): string => {
  if (data.length <= visibleChars) return data;
  return (
    data.substring(0, visibleChars) + "•".repeat(data.length - visibleChars)
  );
};
