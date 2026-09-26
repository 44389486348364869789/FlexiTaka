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

const ERROR_CODE_MAP: Record<string, { bn: string; en: string }> = {
  INVALID_MOBILE_NUMBER: {
    bn: "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন ০১৭XXXXXXXX)",
    en: "Please enter a valid 11-digit Bangladesh mobile number",
  },
  UNSUPPORTED_OPERATOR: {
    bn: "এই অপারেটরটি বর্তমানে সমর্থিত নয়। GP, Robi বা Banglalink ব্যবহার করুন।",
    en: "Unsupported operator. Please use GP, Robi, or Banglalink.",
  },
  OPERATOR_MISMATCH: {
    bn: "নির্বাচিত অপারেটর ও মোবাইল নম্বরের প্রেফিক্স মিলছে না।",
    en: "The selected operator does not match this mobile number prefix.",
  },
  AMOUNT_OUT_OF_RANGE: {
    bn: "পরিমাণ অবশ্যই ৳১০ থেকে ৳৫০,০০০ এর মধ্যে হতে হবে।",
    en: "Amount must be between ৳10 and ৳50,000.",
  },
  INSUFFICIENT_BALANCE: {
    bn: "আপনার সিমে পর্যাপ্ত ব্যালেন্স নেই।",
    en: "Insufficient SIM balance to complete this transaction.",
  },
  INSUFFICIENT_REMAINING_QUOTA: {
    bn: "আপনার সিমের অনুমোদিত ব্যালেন্স ট্রান্সফার সীমা অতিক্রম করেছে।",
    en: "Operator balance transfer quota exceeded for this SIM.",
  },
  TRANSFER_COUNT_LIMIT_REACHED: {
    bn: "অপারেটর ব্যালেন্স ট্রান্সফারের মাসিক সংখ্যা সীমা (১০টি) পূর্ণ হয়েছে।",
    en: "Monthly balance transfer count limit reached for this line.",
  },
  SIM_IN_COOLDOWN: {
    bn: "সিমটি বর্তমানে কুলডাউনে রয়েছে, অনুগ্রহ করে কয়েক মিনিট অপেক্ষা করুন।",
    en: "This line is currently in cooldown. Please wait a few moments.",
  },
  NO_RECEIVING_SIM_AVAILABLE: {
    bn: "বর্তমানে কোনো রিচার্জ লাইন খালি নেই, অনুগ্রহ করে অপেক্ষা করুন।",
    en: "No recharge line currently available. Order queued automatically.",
  },
  PAYMENT_NOT_VERIFIED: {
    bn: "পেমেন্ট এখনো যাচাই সম্পন্ন হয়নি। অনুগ্রহ করে TrxID সঠিক দিন।",
    en: "Payment not yet verified. Please verify your TrxID.",
  },
  ORDER_EXPIRED: {
    bn: "অর্ডারের সময়সীমা উত্তীর্ণ হয়েছে। দয়া করে নতুন অর্ডার তৈরি করুন।",
    en: "Order has expired. Please initiate a new transaction.",
  },
  DUPLICATE_PAYMENT: {
    bn: "এই ট্রানজ্যাকশন আইডি (TrxID) ইতোমধ্যেই অন্য অর্ডারে ব্যবহৃত হয়েছে।",
    en: "This transaction ID has already been recorded for an order.",
  },
  TRANSFER_IN_PROGRESS: {
    bn: "একটি ব্যালেন্স ট্রান্সফার ইতোমধ্যেই চলমান রয়েছে।",
    en: "A balance transfer is already in progress for this order.",
  },
  TRANSFER_FAILED: {
    bn: "ব্যালেন্স ট্রান্সফার প্রক্রিয়া ব্যর্থ হয়েছে।",
    en: "Balance transfer could not be completed.",
  },
  RECONCILIATION_REQUIRED: {
    bn: "ব্যালেন্স যাচাই অপেক্ষমাণ, অ্যাডমিন সহায়তা নিন।",
    en: "Reconciliation required. Please contact support.",
  },
};

export function formatApiErrorMessage(err: any, lang: "bn" | "en" = "bn"): string {
  if (!err) return lang === "bn" ? "একটি অপ্রত্যাশিত সমস্যা হয়েছে।" : "An unexpected error occurred.";

  const code = (err.code || "").toUpperCase();
  if (code && ERROR_CODE_MAP[code]) {
    return lang === "bn" ? ERROR_CODE_MAP[code].bn : ERROR_CODE_MAP[code].en;
  }

  let msg = err.message || (typeof err === "string" ? err : "");
  if (!msg) {
    return lang === "bn" ? "অনুরোধ প্রক্রিয়া করতে ব্যর্থ হয়েছে।" : "Failed to process request.";
  }

  // Handle bilingual format: "English Message / বাংলা বার্তা"
  if (msg.includes(" / ")) {
    const [enPart, bnPart] = msg.split(" / ");
    return lang === "bn" ? (bnPart || enPart).trim() : enPart.trim();
  }

  // Handle colon format: "বাংলা বার্তা : English Message"
  if (msg.includes(" : ")) {
    const parts = msg.split(" : ");
    return lang === "bn" ? parts[0].trim() : parts[1].trim();
  }

  return msg;
}
