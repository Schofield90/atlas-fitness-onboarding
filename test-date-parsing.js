// Test the date parsing logic locally
function parseDate(dateStr) {
  if (!dateStr) return "";

  // Try UK format first (DD/MM/YYYY)
  let parts = dateStr.split("/");
  if (parts.length === 3) {
    const [first, second, year] = parts;
    const firstNum = parseInt(first);
    const secondNum = parseInt(second);
    
    console.log(`Input: ${dateStr}`);
    console.log(`Parts: [${first}, ${second}, ${year}]`);
    console.log(`Numbers: [${firstNum}, ${secondNum}]`);
    
    // Logic to determine format:
    // If first > 12, it must be DD/MM/YYYY (day > 12)
    // If second > 12, it must be MM/DD/YYYY (day > 12) 
    // Otherwise, assume MM/DD/YYYY (US format) since that's more common in exported data
    
    if (firstNum > 12) {
      // Must be DD/MM/YYYY format
      const result = `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
      console.log(`DD/MM/YYYY detected -> ${result}`);
      return result;
    } else if (secondNum > 12) {
      // Must be MM/DD/YYYY format  
      const result = `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
      console.log(`MM/DD/YYYY detected -> ${result}`);
      return result;
    } else {
      // Ambiguous case - assume MM/DD/YYYY (US format) since it's more common in exports
      const result = `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
      console.log(`Ambiguous, assuming MM/DD/YYYY -> ${result}`);
      return result;
    }
  }
  // Try ISO format (YYYY-MM-DD)
  if (dateStr.includes("-")) {
    return dateStr;
  }
  return dateStr;
}

// Test with sample data
console.log("=== Testing Date Parsing ===");
parseDate("01/15/2025");
parseDate("15/01/2025");
parseDate("01/05/2025");

console.log("\n=== Testing DateTime Construction ===");
const bookingDate = parseDate("01/15/2025");
const bookingTime = "09:00";
const formattedTime = bookingTime.includes(':') ? bookingTime : `${bookingTime}:00`;
const sessionStartTime = `${bookingDate}T${formattedTime}:00`;

console.log(`Final DateTime: ${sessionStartTime}`);

// Test if this creates a valid Date object
const testDate = new Date(sessionStartTime);
console.log(`Date object: ${testDate}`);
console.log(`Is valid: ${!isNaN(testDate.getTime())}`);