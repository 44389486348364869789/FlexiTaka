export interface PrivacySection {
  id: string;
  title: string;
  content: string[];
}

export const privacyTranslations = {
  bn: {
    badge: "তথ্য সুরক্ষা ও জিরো-ক্রেডেনশিয়াল নিশ্চয়তা",
    title: "গোপনীয়তা নীতি (Privacy Policy)",
    subtitle: "FlexiTaka কীভাবে আপনার তথ্যের সর্বোচ্চ নিরাপত্তা নিশ্চিত করে এবং জিরো-ক্রেডেনশিয়াল নীতি বজায় রাখে তা জানুন।",
    lastUpdated: "সর্বশেষ আপডেট: সেপ্টেম্বর ২০২৬ • কার্যকরের তারিখ: সেপ্টেম্বর ২০২৬",
    tocTitle: "সূচিপত্র (সেকশনে যান)",
    supportPrompt: "গোপনীয়তা নীতি সম্পর্কে প্রশ্ন থাকলে:",
    supportEmail: "যোগাযোগ: Contact@flexitaka.com",

    sections: [
      {
        id: "introduction",
        title: "১. ভূমিকা ও পরিধি (Introduction & Scope)",
        content: [
          "FlexiTaka (ওয়েবসাইট: https://flexitaka.com) ব্যবহারকারীদের ব্যক্তিগত গোপনীয়তা এবং তথ্যের সুরক্ষাকে সর্বোচ্চ অগ্রাধিকার প্রদান করে। এই নীতিমালায় বর্ণিত হয়েছে আমরা কী কী তথ্য সংগ্রহ করি, কীভাবে তা ব্যবহার করি এবং কীভাবে সুরক্ষিত রাখি।",
        ],
      },
      {
        id: "information-collected",
        title: "২. যে সকল তথ্য আমরা সংগ্রহ করি (Information We Collect)",
        content: [
          "অর্ডার সম্পাদন ও ভেরিফিকেশনের জন্য আমরা শুধুমাত্র প্রয়োজনীয় ন্যূনতম তথ্য সংগ্রহ করি:",
          "- মোবাইল নম্বর (ব্যালেন্স প্রেরক বা রিচার্জ প্রাপক)",
          "- পেআউট তথ্য (bKash, Nagad বা ব্যাংক অ্যাকাউন্ট নম্বর)",
          "- লেনদেন রেফারেন্স (টেলিকম SMS কনফার্মেশন কোড বা TrxID)",
          "- ভেরিফিকেশনের সুবিধার্থে ব্যবহারকারী কর্তৃক স্বেচ্ছায় আপলোডকৃত স্ক্রিনশট।",
        ],
      },
      {
        id: "how-we-use",
        title: "৩. তথ্যের ব্যবহার (How We Use Your Information)",
        content: [
          "সংগৃহীত তথ্য শুধুমাত্র অর্ডার প্রক্রিয়াকরণ, ব্যালেন্স ট্রান্সফার নিশ্চিতকরণ, পেআউট বিতরণ এবং গ্রাহক সেবা প্রদানের উদ্দেশ্যে ব্যবহৃত হয়।",
        ],
      },
      {
        id: "legal-basis",
        title: "৪. তথ্য প্রক্রিয়াকরণের আইনি ভিত্তি (Legal Grounds)",
        content: [
          "ব্যবহারকারীর সাথে চুক্তি বাস্তবায়ন এবং সেবা সুষ্ঠুভাবে পরিচালনার বৈধ ব্যবসায়িক স্বার্থের ভিত্তিতে এই তথ্য সংরক্ষিত হয়।",
        ],
      },
      {
        id: "information-sharing",
        title: "৫. তথ্য আদান-প্রদান নীতিমালা (Information Sharing)",
        content: [
          "FlexiTaka কখনোই বাণিজ্যিক বা বিপণনের উদ্দেশ্যে গ্রাহকের কোনো ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি বা ভাড়া দেয় না।",
        ],
      },
      {
        id: "data-retention",
        title: "৬. তথ্য সংরক্ষণের সময়সীমা (Data Retention)",
        content: [
          "লেনদেনের ইতিহাস ও ভেরিফিকেশন প্রমাণাদি শুধুমাত্র আইনি বাধ্যবাধকতা এবং বিরোধ নিষ্পত্তির জন্য নির্ধারিত ন্যূনতম সময়ের জন্য এনক্রিপ্ট অবস্থায় সংরক্ষণ করা হয়।",
        ],
      },
      {
        id: "data-security",
        title: "৭. তথ্য সুরক্ষা ও নিরাপদ স্টোরেজ (Data Security)",
        content: [
          "সকল ডেটা ট্রানজিট ও রেস্টে ইন্ডাস্ট্রির মানসম্মত আধুনিক এনক্রিপশন প্রোটোকল দ্বারা সুরক্ষিত। ব্যবহারকারীর আপলোডকৃত স্ক্রিনশট নিরাপদ ক্লাউড অবকাঠামোতে সংরক্ষিত থাকে।",
        ],
      },
      {
        id: "passwords-otp",
        title: "৮. জিরো-ক্রেডেনশিয়াল নীতি (Zero-Telecom-Secret Policy)",
        content: [
          "কঠোর নীতি: FlexiTaka কখনোই গ্রাহকের সিম পিন (SIM PIN), মাইজিপি/মাইরবি/মাইবিএল পাসওয়ার্ড বা টেলিকম এসএমএস ভেরিফিকেশন ওটিপি সংগ্রহ বা সঞ্চয় করে না। লেনদেনের নিয়ন্ত্রণ গ্রাহকের হ্যান্ডসেটে সংরক্ষিত।",
        ],
      },
      {
        id: "guest-linking",
        title: "৯. গেস্ট সেশন ও অ্যাকাউন্ট লিঙ্কিং (Guest Sessions)",
        content: [
          "গেস্ট সেশনে ব্যবহৃত ডেটা ব্রাউজার টোকেন দ্বারা নিয়ন্ত্রিত হয়। ফোন নম্বর ভেরিফিকেশনের মাধ্যমে গ্রাহক যেকোনো সময় তা স্থায়ী অ্যাকাউন্টে রূপান্তর করতে পারেন।",
        ],
      },
      {
        id: "user-rights",
        title: "১০. ব্যবহারকারীর অধিকার (User Rights)",
        content: [
          "গ্রাহকের নিজের সংরক্ষিত তথ্য দেখার, সংশোধনের বা মুছে ফেলার অনুরোধ করার পূর্ণ আইনি অধিকার রয়েছে।",
        ],
      },
      {
        id: "children",
        title: "১১. অপ্রাপ্তবয়স্কদের সুরক্ষা (Children's Privacy)",
        content: [
          "আমাদের সেবা ১৮ বছর বা তার বেশি বয়সী অথবা বৈধ সিমের আইনি দায়িত্বপ্রাপ্ত ব্যক্তিদের ব্যবহারের জন্য নির্ধারিত।",
        ],
      },
      {
        id: "international",
        title: "১২. ক্লাউড অবকাঠামো (Cloud Infrastructure)",
        content: [
          "আমাদের ডেটা অবকাঠামো উচ্চ ক্ষমতাসম্পন্ন ও নিয়ন্ত্রিত সিকিউর ক্লাউড পরিবেশে পরিচালিত হয়।",
        ],
      },
      {
        id: "cookies-storage",
        title: "১৩. কুকিজ ও লোকাল স্টোরেজ (Cookies & Local Storage)",
        content: [
          "সেশনের ধারাবাহিকতা রক্ষা (যেমন গেস্ট টোকেন) এবং নির্বাচিত ভাষা (বাংলা বা ইংরেজি) মনে রাখার জন্য আমরা ব্রাউজার কুকি এবং লোকাল স্টোরেজ ব্যবহার করি।",
        ],
      },
      {
        id: "security-incidents",
        title: "১৪. নিরাপত্তা ঘটনা ব্যবস্থাপনা (Incident Management)",
        content: [
          "যেকোনো অনাকাঙ্ক্ষিত নিরাপত্তা ত্রুটি দেখা দিলে আমাদের টিম অবিলম্বে প্রতিরোধমূলক ব্যবস্থা গ্রহণ করে এবং প্রয়োজনীয় ক্ষেত্রে ব্যবহারকারীকে অবহিত করে।",
        ],
      },
      {
        id: "changes",
        title: "১৫. নীতিমালার পরিবর্তন (Policy Updates)",
        content: [
          "গোপনীয়তা নীতিতে কোনো পরিবর্তন আনা হলে তা এই ওয়েব পেজে আপডেট প্রকাশের মাধ্যমে গ্রাহকদের জানিয়ে দেওয়া হবে।",
        ],
      },
      {
        id: "contact",
        title: "১৬. ডেটা প্রাইভেসি যোগাযোগ (Privacy Contact)",
        content: [
          "আপনার তথ্য বা গোপনীয়তা সম্পর্কিত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন: Contact@flexitaka.com",
        ],
      },
    ],
  },

  en: {
    badge: "DATA PROTECTION & ZERO-CREDENTIAL ASSURANCE",
    title: "Privacy Policy",
    subtitle: "Learn how FlexiTaka safeguards user information, adheres to Zero-Credential principles, and protects transaction data in Bangladesh.",
    lastUpdated: "Last Updated: September 2026 • Effective Date: September 2026",
    tocTitle: "Table of Contents (Jump to Section)",
    supportPrompt: "Questions regarding our Privacy Policy?",
    supportEmail: "Contact: Contact@flexitaka.com",

    sections: [
      {
        id: "introduction",
        title: "1. Introduction & Scope",
        content: [
          "FlexiTaka (https://flexitaka.com) prioritizes the privacy and security of every user. This policy explains what information we collect, how it is used, and how it is secured.",
        ],
      },
      {
        id: "information-collected",
        title: "2. Information We Collect",
        content: [
          "We collect only minimal necessary data required to process airtime orders:",
          "- Mobile telephone numbers (source airtime SIM or recharge target)",
          "- Payout credentials (bKash, Nagad, or commercial bank account details)",
          "- Transaction identifiers (SMS reference codes and TrxIDs)",
          "- Optional confirmation screenshots uploaded voluntarily by users.",
        ],
      },
      {
        id: "how-we-use",
        title: "3. How We Use Your Information",
        content: [
          "Collected data is utilized strictly to fulfill orders, verify balance transfers, remit payouts, and provide customer assistance.",
        ],
      },
      {
        id: "legal-basis",
        title: "4. Legal Grounds for Processing",
        content: [
          "We process personal data based on contractual necessity to execute your transactions and legitimate compliance obligations.",
        ],
      },
      {
        id: "information-sharing",
        title: "5. Information Sharing & Third Parties",
        content: [
          "FlexiTaka does NOT sell, rent, or trade personal data to third parties for marketing purposes.",
        ],
      },
      {
        id: "data-retention",
        title: "6. Data Retention Policy",
        content: [
          "Transaction records and verification evidence are retained in encrypted storage only as long as necessary for auditing and dispute resolution.",
        ],
      },
      {
        id: "data-security",
        title: "7. Data Security Measures & Private Proof Storage",
        content: [
          "All data in transit and at rest is secured via industry-standard encryption protocols. Uploaded files are isolated in private cloud storage.",
        ],
      },
      {
        id: "passwords-otp",
        title: "8. Zero-Telecom-Secret Policy",
        content: [
          "Strict Principle: We NEVER collect, solicit, or store your SIM PIN, MyGP/MyRobi/MyBL account passwords, or telecom SMS OTPs. Transfers are executed entirely by you.",
        ],
      },
      {
        id: "guest-linking",
        title: "9. Guest Sessions & Account Linking",
        content: [
          "Guest sessions rely on browser-scoped tokens. You can convert guest activity into a verified profile via SMS OTP at any time.",
        ],
      },
      {
        id: "user-rights",
        title: "10. User Rights & Data Requests",
        content: [
          "You have the right to request access, correction, or deletion of your personal transaction data upon reasonable verification.",
        ],
      },
      {
        id: "children",
        title: "11. Age Policy & Children's Privacy",
        content: [
          "FlexiTaka is intended for individuals aged 18 and older who hold lawful authority over their telecom SIM cards.",
        ],
      },
      {
        id: "international",
        title: "12. Cloud Infrastructure & Processing",
        content: [
          "Data operations are maintained across audited, highly secure cloud computing infrastructure with redundancy.",
        ],
      },
      {
        id: "cookies-storage",
        title: "13. Cookies & Browser Local Storage",
        content: [
          "We use essential cookies and local storage to preserve session state and remember your chosen language preference (Bangla or English).",
        ],
      },
      {
        id: "security-incidents",
        title: "14. Incident Management & Response",
        content: [
          "We maintain active monitoring protocols to identify, isolate, and remediate potential security risks promptly.",
        ],
      },
      {
        id: "changes",
        title: "15. Updates to this Privacy Policy",
        content: [
          "Any policy revisions will be published immediately on this page with an updated effective date.",
        ],
      },
      {
        id: "contact",
        title: "16. Data Privacy Contact Information",
        content: [
          "For privacy inquiries, contact our data protection team at Contact@flexitaka.com.",
        ],
      },
    ],
  },
};
