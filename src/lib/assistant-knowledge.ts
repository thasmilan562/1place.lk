import { AssistantSettings, AssistantFAQ, AssistantLanguage } from "./types";
import { siteSettings } from "./data";

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: true,
  assistant_name: "1Place Assistant",
  assistant_subtitle: "Your 1place.lk Shopping Concierge",
  avatar_url: "/icon.svg",
  tooltip_text: "Hi, I'm your 1place.lk Assistant 👋 Need help finding a product?",
  welcome_message_en:
    "Welcome to 1place.lk! 👋\nI can help you explore premium smartphones, computing, audio gear, check prices and live inventory, track your orders, and answer warranty questions. How can I assist you today?",
  welcome_message_ta:
    "1place.lk-க்கு நல்வரவு! 👋\nஉங்களுக்கு ஏற்ற ஸ்மார்ட்போன், லேப்டாப், ஆடியோ சாதனங்கள் தெரிவு செய்ய, விலை & stock பார்க்க, order track செய்ய நான் உதவுகிறேன். இன்று உங்களுக்கு எப்படி உதவ முடியும்?",
  welcome_message_si:
    "1place.lk වෙත සාදරයෙන් පිළිගනිමු! 👋\nඔබට සුදුසුම දුරකථන, පරිගණක උපාංග තෝරාගැනීමට, මිල ගණන් පරීක්ෂා කිරීමට සහ Order Track කිරීමට මට උදවු කළ හැක. අද ඔබට උදවු කරන්නේ කෙසේද?",
  supported_languages: ["en", "ta", "si"],
  business_hours: "Monday – Saturday: 9:00 AM – 7:00 PM | Sunday: 10:00 AM – 4:00 PM",
  offline_message:
    "Our concierge team is currently offline. You can place your order online anytime or message us on WhatsApp, and our team will get back to you promptly.",
  phone: siteSettings.phone,
  whatsapp: siteSettings.whatsapp,
  email: siteSettings.email,
  address: siteSettings.address,
  rate_limit_per_minute: 20,
  retention_days: 60,
};

export const ASSISTANT_QUICK_ACTIONS: Record<
  AssistantLanguage,
  { id: string; label: string; icon: string; action: string; payload?: Record<string, unknown> | string | number | boolean | null }[]
> = {
  en: [
    { id: "find_phone", label: "📱 Find Products", icon: "Smartphone", action: "start_find_phone" },
    { id: "budget_phone", label: "💰 Under LKR 100k", icon: "Tag", action: "budget_100k" },
    { id: "flagships", label: "🔥 New Flagships", icon: "Flame", action: "find_flagships" },
    { id: "audio_tech", label: "🎧 Audio & TWS", icon: "Headphones", action: "find_audio" },
    { id: "track_order", label: "📦 Track Order", icon: "Package", action: "start_track_order" },
    { id: "human_support", label: "💬 WhatsApp Support", icon: "MessageCircle", action: "open_whatsapp" },
  ],
  ta: [
    { id: "find_phone", label: "📱 பொருட்கள் தேட", icon: "Smartphone", action: "start_find_phone" },
    { id: "budget_phone", label: "💰 100k-க்குள் Phone", icon: "Tag", action: "budget_100k" },
    { id: "flagships", label: "🔥 புதிய Flagships", icon: "Flame", action: "find_flagships" },
    { id: "audio_tech", label: "🎧 Audio & Buds", icon: "Headphones", action: "find_audio" },
    { id: "track_order", label: "📦 Order Track", icon: "Package", action: "start_track_order" },
    { id: "human_support", label: "💬 WhatsApp உதவி", icon: "MessageCircle", action: "open_whatsapp" },
  ],
  si: [
    { id: "find_phone", label: "📱 භාණ්ඩ සොයන්න", icon: "Smartphone", action: "start_find_phone" },
    { id: "budget_phone", label: "💰 100k යටතේ", icon: "Tag", action: "budget_100k" },
    { id: "flagships", label: "🔥 නවතම Flagships", icon: "Flame", action: "find_flagships" },
    { id: "audio_tech", label: "🎧 Audio උපාංග", icon: "Headphones", action: "find_audio" },
    { id: "track_order", label: "📦 Order Track", icon: "Package", action: "start_track_order" },
    { id: "human_support", label: "💬 WhatsApp", icon: "MessageCircle", action: "open_whatsapp" },
  ],
};

export const DEFAULT_FAQS: AssistantFAQ[] = [
  {
    id: "faq-warranty",
    category: "warranty",
    question_en: "What warranty do you offer on products at 1place.lk?",
    answer_en:
      "All products sold at 1place.lk are 100% genuine and covered by official brand warranty or 1-Year hardware warranty with comprehensive customer care.",
    question_ta:
      "1place.lk-ல் என்ன warranty வழங்கப்படுகிறது?",
    answer_ta:
      "1place.lk-ல் விற்கப்படும் அனைத்து பொருட்களும் 100% Genuine மற்றும் அதிகாரப்பூர்வ Brand Warranty அல்லது 1 வருட Warranty பாதுகாப்புடன் வழங்கப்படுகின்றன.",
    question_si:
      "1place.lk වෙතින් ලබාදෙන වගකීම් සහතිකය කුමක්ද?",
    answer_si:
      "අපගේ සියලුම නිෂ්පාදන 100% මුල් නිෂ්පාදන වන අතර වසරක නිල වගකීමක් හිමිවේ.",
    order: 1,
  },
  {
    id: "faq-delivery",
    category: "orders",
    question_en: "How long does delivery take in Sri Lanka?",
    answer_en:
      "We provide fast islandwide door-to-door courier delivery across all 25 districts in Sri Lanka within 1–3 business days.",
    question_ta:
      "இலங்கை முழுவதும் Delivery செய்ய எவ்வளவு காலம் எடுக்கும்?",
    answer_ta:
      "இலங்கையின் 25 மாவட்டங்களுக்கும் 1–3 வேலை நாட்களுக்குள் விரைவான Doorstep Courier Delivery செய்யப்படுகிறது.",
    question_si:
      "දිවයින පුරා Delivery සඳහා කොපමණ කාලයක් ගතවේද?",
    answer_si:
      "දිවයින පුරා දින 1-3ක් ඇතුළත ආරක්ෂිතව නිවසටම Delivery කරනු ලැබේ.",
    order: 2,
  },
  {
    id: "faq-payment",
    category: "payment",
    question_en: "What payment methods are supported?",
    answer_en:
      "We support secure Credit / Debit Card payments (Visa, MasterCard, Amex via PayHere) and Cash on Delivery (COD) islandwide.",
    question_ta:
      "என்னென்ன Payment முறைகள் உள்ளன?",
    answer_ta:
      "Visa, MasterCard, Amex Card Payments (PayHere பாதுகாப்பான Gateway) மற்றும் Cash on Delivery (COD) முறைகள் உள்ளன.",
    question_si:
      "භාවිතා කළ හැකි Payment ක්‍රම මොනවාද?",
    answer_si:
      "Visa, MasterCard, Amex Card Payments සහ භාණ්ඩ ලැබුණු පසු මුදල් ගෙවීමේ (COD) පහසුකම ඇත.",
    order: 3,
  },
];
