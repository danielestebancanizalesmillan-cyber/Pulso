import disposableDomains from "disposable-email-domains";

export const isEmailDisposable = (email: string): boolean => {
    const domain = email.split("@")[1];
    if (!domain) return false;
    return disposableDomains.includes(domain.toLowerCase());
};
