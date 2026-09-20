/**
 * Global authoritative BDT currency formatter for FlexiTaka.
 * Always renders with the official Bangladesh currency symbol: ৳
 * Supports string, number, Bengali digits, and negative deduction formatting.
 *
 * Examples:
 *   formatBDT(1000) => "৳1,000"
 *   formatBDT(1000, { lang: "bn" }) => "৳১,০০০"
 *   formatBDT("950.00") => "৳950"
 *   formatBDT("200.00", { isDeduction: true }) => "−৳200"
 *   formatBDT("50.00", { preserveDecimals: true }) => "৳50.00"
 */

const BN_DIGITS: { [key: string]: string } = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export function toBnDigits(value: string | number): string {
  const str = String(value);
  return str.replace(/[0-9]/g, (match) => BN_DIGITS[match] || match);
}

export function formatBDT(
  amount: string | number | null | undefined,
  options: {
    isDeduction?: boolean;
    preserveDecimals?: boolean;
    lang?: "bn" | "en";
  } = {}
): string {
  if (amount === null || amount === undefined || amount === "") {
    return options.lang === "bn" ? "৳০" : "৳0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return options.lang === "bn" ? "৳০" : "৳0";
  }

  const absNum = Math.abs(num);
  let formatted: string;

  if (options.preserveDecimals) {
    formatted = absNum.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    // If number has fractional poisha != 0, preserve 2 decimal places; otherwise show clean integer
    if (absNum % 1 !== 0) {
      formatted = absNum.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      formatted = absNum.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      });
    }
  }

  if (options.lang === "bn") {
    formatted = toBnDigits(formatted);
  }

  const prefix = options.isDeduction ? "−৳" : "৳";
  return `${prefix}${formatted}`;
}
