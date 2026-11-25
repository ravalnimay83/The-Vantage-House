export const COUNTRY_CODES = [
    { code: "+91", label: "IN (+91)" },
    { code: "+1", label: "US (+1)" },
    { code: "+44", label: "UK (+44)" },
    { code: "+971", label: "AE (+971)" },
    { code: "+61", label: "AU (+61)" },
    { code: "+65", label: "SG (+65)" },
    { code: "+49", label: "DE (+49)" },
    { code: "+81", label: "JP (+81)" },
];

export const isValidEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
};

const DOMAIN_TYPOS = {
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gnail.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.con": "gmail.com",
    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "yhoo.com": "yahoo.com",
    "outlok.com": "outlook.com",
    "outllok.com": "outlook.com",
    "hotmal.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "iclod.com": "icloud.com",
};

export const getEmailTypoSuggestion = (email) => {
    if (!email || !email.includes("@")) return null;
    const parts = email.trim().split("@");
    if (parts.length !== 2) return null;
    const [local, domain] = parts;
    const lowerDomain = domain.toLowerCase();
    const suggestedDomain = DOMAIN_TYPOS[lowerDomain];
    if (!suggestedDomain) return null;
    return {
        suggestedDomain,
        correctedEmail: `${local}@${suggestedDomain}`,
    };
};

export const isPhoneLike = (value) => {
    if (!value) return false;
    const trimmed = value.trim();
    return /^[+\d][\d\s-]*$/.test(trimmed) && !trimmed.includes("@");
};

export const validatePhoneDigits = (rawDigits, countryCode = "+91") => {
    const digits = (rawDigits || "").replace(/\D/g, "");
    if (countryCode === "+91") {
        if (digits.length !== 10) {
            return { valid: false, message: "Enter a valid 10-digit Indian mobile number." };
        }
        return { valid: true, formatted: `${countryCode}${digits}` };
    }
    if (digits.length < 7 || digits.length > 15) {
        return { valid: false, message: "Enter a valid mobile number (7–15 digits)." };
    }
    return { valid: true, formatted: `${countryCode}${digits}` };
};
