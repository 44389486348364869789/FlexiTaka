export interface FAQItem {
  id: string;
  category: string;
  q: string;
  a: string;
}

export const faqTranslations = {
  bn: {
    badge: "জ্ঞানভান্ডার ও সহায়তা",
    title: "জিজ্ঞাসিত প্রশ্ন ও নির্দেশনা (FAQ)",
    subtitle: "FlexiTaka-এর ক্যাশ আউট, ডিসকাউন্টেড রিচার্জ, নিরাপত্তা এবং নিয়মকানুন সম্পর্কে সকল উত্তর এক জায়গায়।",
    searchPlaceholder: "প্রশ্ন বা কিওয়ার্ড খুঁজুন (যেমন: ক্যাশ আউট, ফি, bKash)...",
    allCategories: "সব ক্যাটাগরি",
    noResults: "আপনার অনুসন্ধানের সাথে মেলে এমন কোনো প্রশ্ন পাওয়া যায়নি।",
    tryDifferentSearch: "অন্য কোনো কিওয়ার্ড লিখে চেষ্টা করুন অথবা আমাদের সহায়তায় সরাসরি বার্তা পাঠান।",
    contactCtaTitle: "আপনার প্রশ্নের উত্তর পাননি?",
    contactCtaDesc: "আমাদের নিবেদিত কাস্টমার সাপোর্ট টিম আপনাকে সার্বক্ষণিক সহায়তা প্রদানে প্রস্তুত।",
    btnContactSupport: "সাপোর্টে যোগাযোগ করুন →",

    categories: {
      about: "FlexiTaka পরিচিতি",
      cashout: "ক্যাশ আউট ব্যালেন্স",
      recharge: "ডিসকাউন্টেড রিচার্জ",
      security: "নিরাপত্তা ও গোপনীয়তা",
      orders: "ভেরিফিকেশন ও অর্ডার",
      support: "সহায়তা ও যোগাযোগ",
    },

    items: [
      {
        id: "about-1",
        category: "FlexiTaka পরিচিতি",
        q: "FlexiTaka কী?",
        a: "FlexiTaka হলো বাংলাদেশের প্রথম ডিজিটাল নন-কাস্টডিয়াল এয়ারটাইম প্ল্যাটফর্ম, যার মাধ্যমে আপনি অব্যবহৃত প্রিপেইড মোবাইল ব্যালেন্সকে রূপান্তর করে bKash, Nagad বা ব্যাংক অ্যাকাউন্টে ক্যাশ টাকা হিসেবে নিতে পারেন এবং ৫% নিশ্চিত ডিসকাউন্টে যেকোনো প্রিপেইড সিমে এয়ারটাইম রিচার্জ পাঠাতে পারেন।",
      },
      {
        id: "about-2",
        category: "FlexiTaka পরিচিতি",
        q: "এখানে কী কী সেবা পাওয়া যায়?",
        a: "FlexiTaka দুটি মূল সেবা প্রদান করে: (১) ব্যালেন্স ক্যাশ আউট — অপ্রয়োজনীয় মোবাইল ব্যালেন্স ট্রান্সফার করে bKash/Nagad বা ব্যাংকে টাকা গ্রহণ; এবং (২) ডিসকাউন্টেড রিচার্জ — ফেস ভ্যালু থেকে ৫% কমে যেকোনো বাংলাদেশী প্রিপেইড সিমে রিচার্জ।",
      },
      {
        id: "about-3",
        category: "FlexiTaka পরিচিতি",
        q: "অ্যাকাউন্ট বা রেজিস্ট্রেশন ছাড়া FlexiTaka ব্যবহার করা যাবে?",
        a: "হ্যাঁ। নিবন্ধন করা সম্পূর্ণ ঐচ্ছিক। আপনি চাইলে সরাসরি গেস্ট হিসেবে লেনদেন সম্পন্ন করতে পারবেন। প্রতিটি অর্ডারে একটি নিরাপদ ট্র্যাকিং টোকেন দেওয়া হয়, যা দিয়ে যেকোনো সময় অর্ডারের অগ্রগতি লাইভ দেখা যায়।",
      },
      {
        id: "cashout-1",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "সিম ব্যালেন্স ক্যাশ আউট কীভাবে কাজ করে?",
        a: "প্রথমে আপনার অপারেটর (GP, Robi বা Banglalink) ও ব্যালেন্সের পরিমাণ নির্বাচন করুন এবং আপনার পেআউট ওয়ালেট (bKash, Nagad বা ব্যাংক) নম্বর দিন। এরপর আপনার ফোন থেকে আমাদের নির্ধারিত নম্বরে অপারেটরের অফিশিয়াল USSD কোড বা অ্যাপের মাধ্যমে ব্যালেন্স পাঠান। প্রাপ্ত SMS বা TrxID প্রমাণ হিসেবে জমা দিলেই যাচাই শেষে টাকা আপনার ওয়ালেটে চলে আসবে।",
      },
      {
        id: "cashout-2",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "কোন কোন অপারেটরের সিমে ক্যাশ আউট করা যায়?",
        a: "আমরা বাংলাদেশের শীর্ষ ৩টি মোবাইল নেটওয়ার্ক সাপোর্ট করি: Grameenphone (GP), Robi, এবং Banglalink।",
      },
      {
        id: "cashout-3",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "পেআউটের টাকার পরিমাণ কীভাবে হিসাব করা হয়?",
        a: "স্বচ্ছ ২০% প্ল্যাটফর্ম ফি প্রয়োগ করা হয়। আপনি যে পরিমাণ ব্যালেন্স ট্রান্সফার করবেন, তার ঠিক ৮০% নিট ক্যাশ টাকা সরাসরি আপনার bKash, Nagad বা ব্যাংক অ্যাকাউন্টে পৌঁছে দেওয়া হয়।",
      },
      {
        id: "cashout-4",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "প্ল্যাটফর্ম ফি কত?",
        a: "ক্যাশ আউটে প্ল্যাটফর্ম ফি হলো ২০.০%। এই ফি প্ল্যাটফর্ম প্রসেসিং, রিসিভিং সিম পরিচালনা, লিকুইডিটি ব্যবস্থাপনা এবং পেআউট ডিসবার্সমেন্টের ব্যয় বহন করে।",
      },
      {
        id: "cashout-5",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "ক্যাশ আউটের সর্বনিম্ন সীমা কত?",
        a: "FlexiTaka-তে প্রতি লেনদেনের সর্বনিম্ন পরিমাণ ৳৫০.০০।",
      },
      {
        id: "cashout-6",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "ক্যাশ আউটের সর্বোচ্চ সীমা কত?",
        a: "প্ল্যাটফর্ম সীমা প্রতি লেনদেনে সর্বোচ্চ ৳৫০,০০০.০০ পর্যন্ত। তবে আপনার সিমের জন্য টেলিকম অপারেটর ও BTRC কর্তৃক নির্ধারিত দৈনিক ব্যালেন্স ট্রান্সফার সীমা প্রযোজ্য হতে পারে।",
      },
      {
        id: "cashout-7",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "সিম থেকে ব্যালেন্স কীভাবে ট্রান্সফার করব?",
        a: "ব্যালেন্স ট্রান্সফার সম্পূর্ণভাবে আপনি নিজে আপনার মোবাইল হ্যান্ডসেট থেকে করবেন। অর্ডার প্লেস করার পর সিস্টেম আপনাকে একটি ভেরিফায়েড রিসিভিং নম্বর এবং অপারেটরের নির্দিষ্ট USSD ডায়াল কোড (যেমন GP-এর জন্য *121*1500#, Robi-এর জন্য *121*56#, Banglalink-এর জন্য *1000#) অথবা MyGP/MyRobi/MyBL নির্দেশিকা প্রদর্শন করবে।",
      },
      {
        id: "cashout-8",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "ব্যালেন্স পাঠানোর পর কী প্রমাণ দিতে হয়?",
        a: "ব্যালেন্স পাঠানোর পর অপারেটর থেকে পাওয়া কনফার্মেশন SMS বা TrxID কোডটি সিস্টেমে ইনপুট দিতে হয়। দ্রুত ভেরিফিকেশনের জন্য আপনি চাইলে প্রাপ্ত SMS-এর একটি স্ক্রিনশটও আপলোড করতে পারেন।",
      },
      {
        id: "cashout-9",
        category: "ক্যাশ আউট ব্যালেন্স",
        q: "যাচাই এবং পেআউট পেতে কত সময় লাগে?",
        a: "আপনি তথ্য জমা দেওয়ার পর আমাদের টিম ব্যালেন্স প্রাপ্তি যাচাই করে কয়েক মিনিটের মধ্যে পেআউট অনুমোদন ও প্রেরণ করে।",
      },
      {
        id: "recharge-1",
        category: "ডিসকাউন্টেড রিচার্জ",
        q: "ডিসকাউন্টেড রিচার্জ কী এবং এটি কীভাবে কাজ করে?",
        a: "FlexiTaka-তে রিচার্জ করলে আপনি যেকোনো বাংলাদেশী প্রিপেইড সিমে রিচার্জের ফেস ভ্যালু থেকে সরাসরি ৫% কম মূল্যে পেমেন্ট করতে পারেন। যেমন: ৳১০০ রিচার্জের জন্য আপনাকে মাত্র ৳৯৫ পেমেন্ট করতে হবে।",
      },
      {
        id: "recharge-2",
        category: "ডিসকাউন্টেড রিচার্জ",
        q: "কোন কোন সিমে রিচার্জ পাঠানো যায়?",
        a: "Grameenphone, Robi, এবং Banglalink-এর সকল প্রিপেইড মোবাইল নম্বরে সরাসরি রিচার্জ গ্রহণ করা যায়।",
      },
      {
        id: "recharge-3",
        category: "ডিসকাউন্টেড রিচার্জ",
        q: "রিচার্জের জন্য কীভাবে পেমেন্ট করব?",
        a: "bKash, Nagad, Rocket বা Bangla QR-এর মাধ্যমে আপনি সরাসরি আমাদের নির্দিষ্ট পেমেন্ট নম্বরে টাকা পাঠিয়ে TrxID প্রদান করবেন। পেমেন্ট যাচাই হওয়ার সাথে সাথে টার্গেট নম্বরে রিচার্জ পাঠানো হয়।",
      },
      {
        id: "security-1",
        category: "নিরাপত্তা ও গোপনীয়তা",
        q: "FlexiTaka কি আমার সিম পিন বা পাসওয়ার্ড চাইবে?",
        a: "কখনোই না! FlexiTaka একটি নন-কাস্টডিয়াল প্ল্যাটফর্ম। আমরা কখনই গ্রাহকের সিম পিন (SIM PIN), MyGP/MyRobi/MyBL পাসওয়ার্ড কিংবা টেলিকম SMS OTP চাই না। ব্যালেন্স পাঠানোর দায়িত্ব সম্পূর্ণভাবে গ্রাহকের নিজের নিয়ন্ত্রণে।",
      },
      {
        id: "security-2",
        category: "নিরাপত্তা ও গোপনীয়তা",
        q: "আমার দেওয়া তথ্য ও প্রমাণ কি নিরাপদ?",
        a: "হ্যাঁ। সকল তথ্য ও স্ক্রিনশট এনক্রিপ্ট করে ব্যক্তিগত সুরক্ষিত ক্লাউড স্টোরেজে রাখা হয় এবং নির্দিষ্ট সময় পর নীতিমালা অনুযায়ী মুছে ফেলা হয়।",
      },
      {
        id: "orders-1",
        category: "ভেরিফিকেশন ও অর্ডার",
        q: "আমার অর্ডারের স্ট্যাটাস কীভাবে ট্র্যাক করব?",
        a: "আমাদের ওয়েবসাইটের 'অর্ডার' সেকশনে গিয়ে আপনার অর্ডার আইডি অথবা গেস্ট সেশন টোকেনের মাধ্যমে রিয়েল-টাইমে টাইমলাইন ও স্ট্যাটাস ট্র্যাক করতে পারবেন।",
      },
      {
        id: "orders-2",
        category: "ভেরিফিকেশন ও অর্ডার",
        q: "গেস্ট অর্ডারের পর কীভাবে অ্যাকাউন্ট তৈরি বা লিংক করব?",
        a: "প্রোফাইল পেজে গিয়ে আপনার মোবাইল নম্বর দিয়ে ৬ ডিজিটের SMS OTP যাচাই করলে আপনার পূর্বের সমস্ত গেস্ট অর্ডার স্থায়ী অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে একীভূত হয়ে যাবে।",
      },
      {
        id: "support-1",
        category: "সহায়তা ও যোগাযোগ",
        q: "কোনো সমস্যা হলে কীভাবে যোগাযোগ করব?",
        a: "আমাদের সাপোর্ট পেজ থেকে সরাসরি সাপোর্ট টিকিট খুলতে পারেন অথবা আমাদের অফিশিয়াল ইমেইলে লিখতে পারেন: Contact@flexitaka.com।",
      },
    ],
  },

  en: {
    badge: "KNOWLEDGE BASE & GUIDANCE",
    title: "Frequently Asked Questions (FAQ)",
    subtitle: "Everything you need to know about FlexiTaka's Cash Out, Discounted Recharge, security, and policies in one place.",
    searchPlaceholder: "Search questions or keywords (e.g. Cash Out, fee, bKash)...",
    allCategories: "All Categories",
    noResults: "No matching questions found for your query.",
    tryDifferentSearch: "Try using different keywords or send a direct inquiry to our support desk.",
    contactCtaTitle: "Still have questions?",
    contactCtaDesc: "Our dedicated support team is available to assist you with any inquiries or custom needs.",
    btnContactSupport: "Contact Support Desk →",

    categories: {
      about: "About FlexiTaka",
      cashout: "Cash Out Balance",
      recharge: "Discounted Recharge",
      security: "Security & Privacy",
      orders: "Verification & Orders",
      support: "Support & Contact",
    },

    items: [
      {
        id: "about-1",
        category: "About FlexiTaka",
        q: "What is FlexiTaka?",
        a: "FlexiTaka is a digital airtime liquidity platform in Bangladesh that allows customers to convert unused prepaid mobile balance to liquid cash (sent to bKash, Nagad, or Bank) and purchase discounted mobile airtime recharges across Grameenphone, Robi, and Banglalink.",
      },
      {
        id: "about-2",
        category: "About FlexiTaka",
        q: "What services are available?",
        a: "FlexiTaka offers two primary services: (1) Cash Out SIM Balance — transfer your extra prepaid balance to receive funds directly into your bKash, Nagad, or Bank account; and (2) Discounted Mobile Recharge — top up any prepaid number in Bangladesh and pay less than face value with an instant 5% discount.",
      },
      {
        id: "about-3",
        category: "About FlexiTaka",
        q: "Can I use FlexiTaka without creating an account?",
        a: "Yes. Registration is completely optional. You can initiate and complete transactions as a guest. Every order generates a secure, unique tracking token that allows you to monitor the real-time progress of your order directly from your browser.",
      },
      {
        id: "cashout-1",
        category: "Cash Out Balance",
        q: "How does SIM balance cash out work?",
        a: "Select your operator (GP, Robi, or Banglalink), enter the balance amount you wish to transfer, and provide your payout destination (bKash, Nagad, or Bank). After placing the order, you transfer the specified balance from your handset to our designated receiving number using your operator's standard USSD code or app. Once you submit the transfer reference or proof, our staff verifies the transfer and dispatches your payout.",
      },
      {
        id: "cashout-2",
        category: "Cash Out Balance",
        q: "Which operators are supported for Cash Out?",
        a: "We support prepaid mobile numbers on Bangladesh's three major telecom networks: Grameenphone (GP), Robi, and Banglalink.",
      },
      {
        id: "cashout-3",
        category: "Cash Out Balance",
        q: "How is the payout calculated?",
        a: "Payout is calculated using a transparent 20% platform fee. The fee is deducted from the transferred balance, and you receive exactly 80% net cash deposited directly to your bKash, Nagad, or Bank account.",
      },
      {
        id: "cashout-4",
        category: "Cash Out Balance",
        q: "What is the platform fee?",
        a: "The Cash Out platform fee is 20.0% of the transferred SIM balance. This fee covers platform processing, receiving SIM operations, liquidity balancing, and payout disbursement.",
      },
      {
        id: "cashout-5",
        category: "Cash Out Balance",
        q: "What is the minimum amount for Cash Out?",
        a: "The minimum transaction amount supported on FlexiTaka is ৳50.00.",
      },
      {
        id: "cashout-6",
        category: "Cash Out Balance",
        q: "What is the maximum amount for Cash Out?",
        a: "The platform limit is up to ৳50,000.00 per transaction. Note that your telecom operator may also enforce daily or monthly balance transfer limits per SIM in accordance with BTRC regulations.",
      },
      {
        id: "cashout-7",
        category: "Cash Out Balance",
        q: "How do I transfer my SIM balance?",
        a: "Transfers are executed directly by you from your own handset. After placing an order, our system assigns a specific verified receiving number and shows the exact official USSD dial code for your operator (e.g., *121*1500# for GP, *121*56# for Robi, *1000# for Banglalink) or instructions for transferring via MyGP, MyRobi, or MyBL apps.",
      },
      {
        id: "cashout-8",
        category: "Cash Out Balance",
        q: "What proof is required after transferring?",
        a: "You simply need to enter the telecom transfer reference (such as the SMS confirmation or transaction ID received from your operator). You can also optionally attach a screenshot of the operator SMS confirmation to speed up manual verification.",
      },
      {
        id: "cashout-9",
        category: "Cash Out Balance",
        q: "How long does verification take?",
        a: "Our verification team processes incoming transfers promptly upon receiving your submission. Most payouts are finalized within minutes.",
      },
      {
        id: "recharge-1",
        category: "Discounted Recharge",
        q: "What is Discounted Recharge and how does it work?",
        a: "Discounted Recharge lets you top up any Bangladeshi prepaid SIM card at 5% less than the airtime face value. For instance, you pay only ৳95 for a ৳100 recharge.",
      },
      {
        id: "recharge-2",
        category: "Discounted Recharge",
        q: "Which operators can receive recharges?",
        a: "We support prepaid mobile numbers across Grameenphone, Robi, and Banglalink.",
      },
      {
        id: "recharge-3",
        category: "Discounted Recharge",
        q: "How do I make the payment for Recharge?",
        a: "You transfer payment via bKash, Nagad, Rocket, or Bangla QR to our designated account and provide the TrxID. Once verified, airtime is dispatched immediately.",
      },
      {
        id: "security-1",
        category: "Security & Privacy",
        q: "Does FlexiTaka ever ask for my SIM PIN or password?",
        a: "NEVER. FlexiTaka adheres to strict Zero-Credential principles. We will never ask for your SIM PIN, MyGP/MyRobi/MyBL account passwords, or telecom SMS OTPs. All balance transfers are executed strictly by you via official operator channels.",
      },
      {
        id: "security-2",
        category: "Security & Privacy",
        q: "Is my personal data and transaction proof secure?",
        a: "Yes. All transfer proofs and order data are encrypted and held in private, secure cloud infrastructure under strict retention and privacy guidelines.",
      },
      {
        id: "orders-1",
        category: "Verification & Orders",
        q: "How can I track my order status?",
        a: "Navigate to the Orders tab in our portal using your order ID or guest session token to monitor live timeline events and updates.",
      },
      {
        id: "orders-2",
        category: "Verification & Orders",
        q: "How do I link guest orders to an account?",
        a: "Visit the Profile page, enter your mobile phone number, and verify the 6-digit SMS OTP. All previous orders from your guest session will be automatically linked.",
      },
      {
        id: "support-1",
        category: "Support & Contact",
        q: "How can I get help if something goes wrong?",
        a: "You can open a support ticket directly from our Support page or email us at Contact@flexitaka.com.",
      },
    ],
  },
};
