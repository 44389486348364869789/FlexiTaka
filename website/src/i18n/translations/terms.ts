export interface LegalSection {
  id: string;
  title: string;
  content: string[];
  subsections?: { subtitle: string; text: string }[];
}

export const termsTranslations = {
  bn: {
    badge: "প্ল্যাটফর্ম ব্যবহারকারী চুক্তি",
    title: "সেবার শর্তাবলি (Terms of Service)",
    subtitle: "সিম এয়ারটাইম ক্যাশ আউট বা রিচার্জ সেবা ব্যবহারের পূর্বে অনুগ্রহ করে এই শর্তাবলি সতর্কতার সাথে পড়ুন।",
    lastUpdated: "সর্বশেষ আপডেট: সেপ্টেম্বর ২০২৬ • কার্যকরের তারিখ: সেপ্টেম্বর ২০২৬",
    tocTitle: "সূচিপত্র (সেকশনে যান)",
    supportPrompt: "শর্তাবলি সম্পর্কিত কোনো প্রশ্ন আছে?",
    supportEmail: "যোগাযোগ: Contact@flexitaka.com",

    sections: [
      {
        id: "introduction",
        title: "১. ভূমিকা ও গ্রহণযোগ্যতা (Introduction & Acceptance)",
        content: [
          "FlexiTaka (ওয়েবসাইট: https://flexitaka.com এবং সংশ্লিষ্ট প্ল্যাটফর্ম)-এ আপনাকে স্বাগতম। এই শর্তাবলি গ্রাহক এবং FlexiTaka-এর মধ্যে আইনি চুক্তি হিসেবে কার্যকর হবে।",
          "আমাদের প্ল্যাটফর্মে অর্ডার করা, ভিজিট করা বা ব্রাউজ করার মাধ্যমে আপনি এই শর্তাবলি সম্পূর্ণ মেনে নিচ্ছেন বলে গণ্য হবে। আপনি যদি কোনো শর্তে সম্মত না হন, তবে অনুগ্রহ করে সেবা গ্রহণ থেকে বিরত থাকুন।",
        ],
      },
      {
        id: "services",
        title: "২. FlexiTaka সেবাসমূহ (FlexiTaka Services)",
        content: [
          "FlexiTaka বাংলাদেশে দুটি মূল ডিজিটাল ইউটিলিটি সেবা প্রদান করে:",
          "(ক) ব্যালেন্স ক্যাশ আউট (Cash Out): গ্রাহক তার প্রিপেইড সিম (GP, Robi, Banglalink) থেকে নিরাপদ অপারেটর অথেনটিকেশন বা ভেরিফায়েড চ্যানেলের মাধ্যমে সিস্টেমে ব্যালেন্স স্থানান্তর করেন এবং প্ল্যাটফর্ম ফি বাদ দিয়ে সমমূল্যের ক্যাশ টাকা সরাসরি bKash, Nagad বা ব্যাংকে গ্রহণ করেন।",
          "(খ) ডিসকাউন্টেড রিচার্জ (Discounted Recharge): গ্রাহক যেকোনো বাংলাদেশী প্রিপেইড মোবাইল নম্বরে নির্ধারিত ফেস ভ্যালু থেকে ৫% ছাড়ে সরাসরি এয়ারটাইম টপ-আপ নিতে পারেন।",
        ],
      },
      {
        id: "pricing",
        title: "৩. মূল্য নির্ধারণ ও প্ল্যাটফর্ম ফি (Pricing & Platform Fees)",
        content: [
          "FlexiTaka সম্পূর্ণ স্বচ্ছ ও নির্দিষ্ট গাণিতিক নীতিতে পরিচালিত হয়:",
          "১. ক্যাশ আউটের ক্ষেত্রে ২০.০% প্ল্যাটফর্ম ফি প্রযোজ্য। গ্রাহক ব্যালেন্সের ৮০% নিট টাকা সরাসরি হাতে পান (হিসাব: প্রাপ্ত টাকা = ব্যালেন্স × ৮০%)।",
          "২. রিচার্জের ক্ষেত্রে ৫.০% তাৎক্ষণিক ছাড় প্রযোজ্য। গ্রাহক নির্ধারিত মূল্যের চেয়ে ৫% কম পেমেন্ট করেন (হিসাব: প্রদেয় টাকা = রিচার্জ ফেস ভ্যালু × ৯৫%)।",
          "৩. প্ল্যাটফর্মে কোনো অতিরিক্ত লুকানো সার্ভিস চার্জ বা অ্যাকাউন্ট মেনটেনেন্স ফি নেই।",
        ],
      },
      {
        id: "limits",
        title: "৪. লেনদেনের সীমা ও পরিধি (Transaction Limits)",
        content: [
          "FlexiTaka প্ল্যাটফর্মে প্রতি লেনদেনে সর্বনিম্ন সীমা ৳১০.০০ এবং সর্বোচ্চ সীমা ৳৫০,০০০.০০।",
          "টেলিকম অপারেটর ও BTRC কর্তৃক নির্ধারিত সিম-ভিত্তিক দৈনিক বা মাসিক ব্যালেন্স ট্রান্সফার সীমা ব্যবহারকারীর ব্যক্তিগত সিমে প্রযোজ্য হবে।",
        ],
      },
      {
        id: "eligibility",
        title: "৫. ব্যবহারকারীর যোগ্যতা (User Eligibility)",
        content: [
          "সেবা গ্রহণের জন্য ব্যবহারকারীকে অবশ্যই বাংলাদেশে বৈধভাবে নিবন্ধিত প্রিপেইড সিম ও মোবাইল ফিন্যান্সিয়াল সার্ভিসের আইনগত মালিক বা ক্ষমতাপ্রাপ্ত ব্যবহারকারী হতে হবে।",
        ],
      },
      {
        id: "account-guest",
        title: "৬. গেস্ট সেশন ও অ্যাকাউন্ট লিঙ্কিং (Guest Sessions)",
        content: [
          "নিবন্ধন ছাড়াই গ্রাহক তাত্ক্ষণিক গেস্ট হিসেবে অর্ডার সম্পন্ন করতে পারেন। প্রতিটি গেস্ট সেশনে সুরক্ষিত অনন্য টোকেন তৈরি হয়।",
          "পরবর্তীতে প্রোফাইলে গিয়ে মোবাইল নম্বর ও SMS OTP ভেরিফিকেশনের মাধ্যমে সকল পূর্বের গেস্ট অর্ডার স্থায়ী অ্যাকাউন্টে একীভূত করা যায়।",
        ],
      },
      {
        id: "verification-otp",
        title: "৭. ফোন ভেরিফিকেশন ও জিরো-ক্রেডেনশিয়াল নীতি (Zero Credentials)",
        content: [
          "নিরাপত্তা সতর্কতা: আপনার SIM অ্যাকাউন্ট নিরাপদভাবে যাচাই করতে প্রয়োজনে FlexiTaka একবারের operator verification OTP চাইতে পারে। আমরা কখনো আপনার SIM PIN বা account password চাইব না।",
          "প্ল্যাটফর্ম অ্যাকাউন্ট অ্যাক্সেসের জন্য FlexiTaka প্রেরিত ৬ ডিজিটের ওয়েব লগইন OTP প্রযোজ্য। কোনো অবস্থাতেই আপনার সিম পিন বা গোপন পাসওয়ার্ড কারো সাথে শেয়ার করবেন না।",
        ],
      },
      {
        id: "payment",
        title: "৮. পেমেন্ট প্রক্রিয়া ও ওয়ালেট (Payments)",
        content: [
          "রিচার্জ ক্রয়ের ক্ষেত্রে অনুমোদিত bKash, Nagad, Rocket বা Bangla QR পেমেন্ট চ্যানেলের মাধ্যমে নির্ধারিত পেমেন্ট সম্পন্ন করে সঠিক ট্রানজ্যাকশন আইডি (TrxID) প্রদান করতে হবে।",
        ],
      },
      {
        id: "cashout-verification",
        title: "৯. ব্যালেন্স যাচাই ও পেআউট বিতরণ (Cash Out Verification)",
        content: [
          "ব্যালেন্স ট্রান্সফারের পর গ্রাহক কর্তৃক প্রেরিত TrxID বা SMS রেফারেন্স যাচাই সাপেক্ষে গ্রাহকের মনোনীত ওয়ালেটে তাৎক্ষণিক পেআউট পাঠানো হয়।",
        ],
      },
      {
        id: "recharge-processing",
        title: "১০. রিচার্জ বিতরণ ও প্রসেসিং (Recharge Fulfillment)",
        content: [
          "পেমেন্ট নিশ্চিত হওয়ার সাথে সাথে গ্রাহকের কাঙ্ক্ষিত নম্বরে স্বয়ংক্রিয়ভাবে এয়ারটাইম রিচার্জ পাঠানো হয়।",
        ],
      },
      {
        id: "cancellations",
        title: "১১. প্রত্যাখ্যান ও বাতিলকরণ নীতিমালা (Rejections & Cancellations)",
        content: [
          "ভুল নম্বর প্রদান, অসম্পূর্ণ ব্যালেন্স ট্রান্সফার বা ভুয়া TrxID জমা দিলে সংশ্লিষ্ট অর্ডারটি বাতিল বা প্রত্যাখ্যাত হতে পারে।",
        ],
      },
      {
        id: "refunds",
        title: "১২. রিফান্ড নীতিমালা (Refund Policy)",
        content: [
          "সিস্টেম ত্রুটির কারণে সেবা প্রদানে ব্যর্থ হলে যাচাই সাপেক্ষে গ্রাহককে সমপরিমাণ টাকা ফেরত প্রদান করা হবে।",
        ],
      },
      {
        id: "prohibited-use",
        title: "১৩. নিষিদ্ধ কার্যকলাপ (Prohibited Conduct)",
        content: [
          "অবৈধ উপায়ে অর্জিত সিম ব্যালেন্স ক্যাশ করা, ভুয়া প্রমাণপত্র আপলোড বা প্রতারণামূলক কর্মকাণ্ড কঠোরভাবে নিষিদ্ধ।",
        ],
      },
      {
        id: "user-content",
        title: "১৪. ব্যবহারকারীর তথ্য সংরক্ষণ ও ব্যবহার (User Data)",
        content: [
          "অর্ডার সম্পাদন ও আইনি বাধ্যবাধকতা ব্যতীত গ্রাহকের ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করা হয় না।",
        ],
      },
      {
        id: "availability",
        title: "১৫. সেবার সার্বক্ষণিক প্রাপ্যতা (Service Availability)",
        content: [
          "টেলিকম নেটওয়ার্ক রক্ষণাবেক্ষণ বা ডাউনটাইমের সময় সাময়িকভাবে ব্যালেন্স ট্রান্সফারে বিলম্ব হতে পারে।",
        ],
      },
      {
        id: "third-party",
        title: "১৬. তৃতীয় পক্ষের নেটওয়ার্ক সংক্রান্ত ঘোষণা (Third-Party Telecom)",
        content: [
          "FlexiTaka স্বাধীনভাবে পরিচালিত ফিনটেক প্ল্যাটফর্ম। Grameenphone, Robi ও Banglalink স্ব-স্ব প্রতিষ্ঠানের ট্রেডমার্ক।",
        ],
      },
      {
        id: "liability",
        title: "১৭. দায়বদ্ধতার সীমাবদ্ধতা (Limitation of Liability)",
        content: [
          "গ্রাহক কর্তৃক ভুল নম্বর বা অসতর্কতাবশত ভুল একাউন্টে টাকা পাঠানোর ক্ষেত্রে FlexiTaka দায়বদ্ধ থাকবে না।",
        ],
      },
      {
        id: "user-responsibility",
        title: "১৮. ব্যবহারকারীর দায়িত্ব ও সতর্কতা (User Responsibility)",
        content: [
          "অর্ডার নিশ্চিত করার আগে মোবাইল নম্বর ও অপারেটর সাবধানে যাচাই করে নেওয়া গ্রাহকের দায়িত্ব।",
        ],
      },
      {
        id: "suspension",
        title: "১৯. অ্যাকাউন্ট স্থগিতাদেশ ও সমাপ্তি (Account Suspension)",
        content: [
          "জালিয়াতিপূর্ণ কার্যকলাপের প্রমাণ মিললে সংশ্লিষ্ট ব্যবহারকারীর অ্যাক্সেস অবিলম্বে বাতিল করা হতে পারে।",
        ],
      },
      {
        id: "changes",
        title: "২০. শর্তাবলি পরিবর্তন (Modifications to Terms)",
        content: [
          "আমরা যেকোনো সময় এই শর্তাবলিতে সংশোধনী আনতে পারি। সংশোধিত শর্তাবলি ওয়েবসাইটে প্রকাশের সাথে সাথে কার্যকর হবে।",
        ],
      },
      {
        id: "governing-law",
        title: "২১. পরিচালনা আইন ও বিরোধ নিষ্পত্তি (Governing Law)",
        content: [
          "এই শর্তাবলি গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত আইন দ্বারা পরিচালিত ও নিয়ন্ত্রিত হবে।",
        ],
      },
      {
        id: "contact",
        title: "২২. সাপোর্ট ও যোগাযোগ (Customer Support Contact)",
        content: [
          "যেকোনো প্রশ্ন বা সহায়তার জন্য যোগাযোগ করুন: Contact@flexitaka.com",
        ],
      },
    ],
  },

  en: {
    badge: "PLATFORM USER AGREEMENT",
    title: "Terms of Service",
    subtitle: "Please read these Terms of Service carefully before utilizing FlexiTaka for SIM airtime cash out or airtime recharge transactions.",
    lastUpdated: "Last Updated: September 2026 • Effective Date: September 2026",
    tocTitle: "Table of Contents (Jump to Section)",
    supportPrompt: "Questions about our Terms?",
    supportEmail: "Contact: Contact@flexitaka.com",

    sections: [
      {
        id: "introduction",
        title: "1. Introduction & Acceptance",
        content: [
          "Welcome to FlexiTaka (accessible via https://flexitaka.com and associated applications). These Terms of Service constitute a legally binding agreement between you and FlexiTaka.",
          "By accessing, submitting an order, or browsing this site, you acknowledge that you have read, understood, and agreed to be bound by these Terms.",
        ],
      },
      {
        id: "services",
        title: "2. FlexiTaka Services (Cash Out & Recharge)",
        content: [
          "FlexiTaka provides two primary non-custodial airtime utility operations in Bangladesh:",
          "(a) Cash Out Balance: Customers transfer excess prepaid mobile balance (GP, Robi, Banglalink) to designated accounts via secure operator authentication or verified channels, receiving spendable cash (bKash, Nagad, Bank) minus platform fees.",
          "(b) Discounted Recharge: Customers purchase prepaid mobile airtime top-ups across supported Bangladeshi networks with an authoritative 5% discount below face value.",
        ],
      },
      {
        id: "pricing",
        title: "3. Pricing, Platform Fees & Discounts",
        content: [
          "Pricing rules are transparent and mathematically enforced:",
          "1. Cash Out imposes a 20.0% platform fee. You receive exactly 80.0% of the transferred SIM face value (Formula: Receive = Amount × 80%).",
          "2. Recharge provides a 5.0% discount. You pay exactly 95.0% of the airtime face value (Formula: Pay = Amount × 95%).",
          "3. There are zero hidden fees, zero maintenance charges, and zero surprise deductions.",
        ],
      },
      {
        id: "limits",
        title: "4. Transaction Limits & Quotas",
        content: [
          "The minimum transaction amount supported is ৳10.00. The maximum transaction amount per order is ৳50,000.00.",
          "Telecom operator regulations and BTRC guidelines regarding daily or monthly SIM balance transfer quotas apply to your source SIM.",
        ],
      },
      {
        id: "eligibility",
        title: "5. User Eligibility & Lawful Authority",
        content: [
          "Users must be authorized owners or lawful custodians of the prepaid mobile number and financial accounts utilized on the platform.",
        ],
      },
      {
        id: "account-guest",
        title: "6. Guest Sessions & Optional Account Registration",
        content: [
          "Transactions can be initiated immediately as a guest. Secure tracking tokens allow full lifecycle monitoring in your browser.",
          "Guest sessions can be converted into permanent registered accounts at any time via verified SMS OTP, linking all past orders.",
        ],
      },
      {
        id: "verification-otp",
        title: "7. Phone Verification & OTP Security",
        content: [
          "Security Rule: FlexiTaka may request a one-time operator verification OTP when required to securely authenticate your SIM account. We will never ask for your SIM PIN or account password.",
          "Platform account access uses 6-digit verification codes. Under no circumstances will FlexiTaka solicit your secret SIM PIN, MFS PIN, or account password.",
        ],
      },
      {
        id: "payment",
        title: "8. Payment Submission & Wallet Methods",
        content: [
          "Payments for recharge orders must be remitted via approved bKash, Nagad, Rocket, or Bangla QR channels with an authentic Transaction ID (TrxID).",
        ],
      },
      {
        id: "cashout-verification",
        title: "9. Cash Out Balance Verification & Payouts",
        content: [
          "Upon submitting telecom balance transfer proof, transactions undergo verification before liquid cash is disbursed to your nominated payout wallet.",
        ],
      },
      {
        id: "recharge-processing",
        title: "10. Recharge Processing & Fulfillment",
        content: [
          "Once payment verification is complete, airtime top-ups are dispatched immediately to the designated recipient mobile number.",
        ],
      },
      {
        id: "cancellations",
        title: "11. Rejections, Invalid Evidence & Cancellations",
        content: [
          "Orders with invalid transfer references, fraudulent claims, or unpaid balances may be rejected or cancelled.",
        ],
      },
      {
        id: "refunds",
        title: "12. Refund Policy & Operational Handling",
        content: [
          "In the event of verified platform delivery failures, eligible payments will be refunded to the originating wallet.",
        ],
      },
      {
        id: "prohibited-use",
        title: "13. Prohibited Conduct & Unlawful Activities",
        content: [
          "Utilizing the service for fraudulent balance transfers, laundering illegally obtained airtime, or abusing quotas is strictly prohibited.",
        ],
      },
      {
        id: "user-content",
        title: "14. User-Submitted Information & Data Use",
        content: [
          "User-submitted data is handled strictly in accordance with our Privacy Policy for transaction execution and compliance.",
        ],
      },
      {
        id: "availability",
        title: "15. Service Availability & Maintenance",
        content: [
          "Service availability is subject to telecom operator infrastructure uptime and scheduled maintenance windows.",
        ],
      },
      {
        id: "third-party",
        title: "16. Third-Party Networks & Independent Operation",
        content: [
          "FlexiTaka operates independently. Grameenphone, Robi, and Banglalink are registered trademarks of their respective owners.",
        ],
      },
      {
        id: "liability",
        title: "17. Limitation of Liability",
        content: [
          "FlexiTaka is not liable for subscriber errors such as inputting wrong telephone numbers or incorrect payout account credentials.",
        ],
      },
      {
        id: "user-responsibility",
        title: "18. User Responsibility & Pre-Confirmation Review",
        content: [
          "Users are solely responsible for reviewing all order parameters before executing balance transfers or making payments.",
        ],
      },
      {
        id: "suspension",
        title: "19. Account Suspension & Service Termination",
        content: [
          "We reserve the right to suspend or terminate access for any user found violating these terms or engaging in deceptive activities.",
        ],
      },
      {
        id: "changes",
        title: "20. Modifications to Terms",
        content: [
          "FlexiTaka reserves the right to amend these Terms at any time. Continued use of the platform constitutes acceptance of updated terms.",
        ],
      },
      {
        id: "governing-law",
        title: "21. Governing Law & Dispute Resolution",
        content: [
          "These Terms are governed by and construed in accordance with the laws of the People's Republic of Bangladesh.",
        ],
      },
      {
        id: "contact",
        title: "22. Customer Support Contact Information",
        content: [
          "For inquiries or assistance regarding these Terms, contact our team directly at Contact@flexitaka.com.",
        ],
      },
    ],
  },
};
