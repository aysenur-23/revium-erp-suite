/**
 * Error Handling Utilities
 * Centralized error handling for consistent error management across the application
 */

// Error Types
export interface AppError {
    code: string;
    message: string;
    originalError?: unknown;
    context?: Record<string, unknown>;
}

// Error Codes
export const ErrorCodes = {
    // Authentication errors
    AUTH_NOT_LOGGED_IN: "auth/not-logged-in",
    AUTH_EMAIL_NOT_VERIFIED: "auth/email-not-verified",
    AUTH_INVALID_CREDENTIALS: "auth/invalid-credentials",
    AUTH_USER_NOT_FOUND: "auth/user-not-found",
    AUTH_PERMISSION_DENIED: "auth/permission-denied",

    // Data errors
    DATA_NOT_FOUND: "data/not-found",
    DATA_VALIDATION_FAILED: "data/validation-failed",
    DATA_ALREADY_EXISTS: "data/already-exists",

    // Network errors
    NETWORK_OFFLINE: "network/offline",
    NETWORK_TIMEOUT: "network/timeout",
    NETWORK_REQUEST_FAILED: "network/request-failed",

    // Firebase errors
    FIREBASE_PERMISSION_DENIED: "firebase/permission-denied",
    FIREBASE_UNAVAILABLE: "firebase/unavailable",
    FIREBASE_QUOTA_EXCEEDED: "firebase/quota-exceeded",

    // General errors
    UNKNOWN: "unknown",
    INTERNAL: "internal",
} as const;

// Turkish error messages
const ERROR_MESSAGES: Record<string, string> = {
    [ErrorCodes.AUTH_NOT_LOGGED_IN]: "Oturum açmanız gerekiyor",
    [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: "E-posta adresinizi doğrulamanız gerekiyor",
    [ErrorCodes.AUTH_INVALID_CREDENTIALS]: "Geçersiz e-posta veya şifre",
    [ErrorCodes.AUTH_USER_NOT_FOUND]: "Kullanıcı bulunamadı",
    [ErrorCodes.AUTH_PERMISSION_DENIED]: "Bu işlem için yetkiniz yok",
    [ErrorCodes.DATA_NOT_FOUND]: "Veri bulunamadı",
    [ErrorCodes.DATA_VALIDATION_FAILED]: "Geçersiz veri",
    [ErrorCodes.DATA_ALREADY_EXISTS]: "Bu kayıt zaten mevcut",
    [ErrorCodes.NETWORK_OFFLINE]: "İnternet bağlantınız yok",
    [ErrorCodes.NETWORK_TIMEOUT]: "İstek zaman aşımına uğradı",
    [ErrorCodes.NETWORK_REQUEST_FAILED]: "İstek başarısız oldu",
    [ErrorCodes.FIREBASE_PERMISSION_DENIED]: "Bu işlem için yetkiniz yok",
    [ErrorCodes.FIREBASE_UNAVAILABLE]: "Servis geçici olarak kullanılamıyor",
    [ErrorCodes.FIREBASE_QUOTA_EXCEEDED]: "Kota aşıldı, lütfen daha sonra tekrar deneyin",
    [ErrorCodes.UNKNOWN]: "Bilinmeyen bir hata oluştu",
    [ErrorCodes.INTERNAL]: "Dahili bir hata oluştu",
};

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message: unknown }).message);
    }
    return ERROR_MESSAGES[ErrorCodes.UNKNOWN];
}

/**
 * Extract error code from Firebase error
 */
export function getFirebaseErrorCode(error: unknown): string | null {
    if (error && typeof error === "object" && "code" in error) {
        return String((error as { code: unknown }).code);
    }
    return null;
}

/**
 * Convert error to AppError
 */
export function toAppError(error: unknown, context?: Record<string, unknown>): AppError {
    const firebaseCode = getFirebaseErrorCode(error);

    // Map Firebase error codes to our error codes
    let code = ErrorCodes.UNKNOWN;
    let message = getErrorMessage(error);

    if (firebaseCode) {
        switch (firebaseCode) {
            case "permission-denied":
            case "auth/insufficient-permission":
                code = ErrorCodes.FIREBASE_PERMISSION_DENIED;
                message = ERROR_MESSAGES[code];
                break;
            case "unavailable":
                code = ErrorCodes.FIREBASE_UNAVAILABLE;
                message = ERROR_MESSAGES[code];
                break;
            case "resource-exhausted":
                code = ErrorCodes.FIREBASE_QUOTA_EXCEEDED;
                message = ERROR_MESSAGES[code];
                break;
            case "not-found":
                code = ErrorCodes.DATA_NOT_FOUND;
                message = ERROR_MESSAGES[code];
                break;
            case "already-exists":
                code = ErrorCodes.DATA_ALREADY_EXISTS;
                message = ERROR_MESSAGES[code];
                break;
            case "auth/user-not-found":
            case "auth/wrong-password":
            case "auth/invalid-email":
            case "auth/invalid-credential":
                code = ErrorCodes.AUTH_INVALID_CREDENTIALS;
                message = ERROR_MESSAGES[code];
                break;
            default:
                // Keep original message for unmapped errors
                break;
        }
    }

    // Check for network errors
    if (!navigator.onLine) {
        code = ErrorCodes.NETWORK_OFFLINE;
        message = ERROR_MESSAGES[code];
    }

    return {
        code,
        message,
        originalError: error,
        context,
    };
}

/**
 * Log error with context (only in development)
 */
export function logError(
    message: string,
    error: unknown,
    context?: Record<string, unknown>
): void {
    if (import.meta.env.DEV) {
        console.error(message, {
            error,
            context,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Log warning with context (only in development)
 */
export function logWarning(
    message: string,
    data?: Record<string, unknown>
): void {
    if (import.meta.env.DEV) {
        console.warn(message, {
            data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Log info with context (only in development)
 */
export function logInfo(
    message: string,
    data?: Record<string, unknown>
): void {
    if (import.meta.env.DEV) {
        console.info(message, {
            data,
            timestamp: new Date().toISOString(),
        });
    }
}

/**
 * Safe async operation wrapper with error handling
 */
export async function safeAsync<T>(
    operation: () => Promise<T>,
    options?: {
        fallback?: T;
        context?: string;
        silent?: boolean;
    }
): Promise<{ data: T | null; error: AppError | null }> {
    try {
        const data = await operation();
        return { data, error: null };
    } catch (error) {
        const appError = toAppError(error, { context: options?.context });

        if (!options?.silent) {
            logError(options?.context || "Async operation failed", error);
        }

        if (options?.fallback !== undefined) {
            return { data: options.fallback, error: appError };
        }

        return { data: null, error: appError };
    }
}

/**
 * Create retry wrapper for async operations
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options?: {
        maxRetries?: number;
        delayMs?: number;
        onRetry?: (attempt: number, error: unknown) => void;
    }
): T {
    const maxRetries = options?.maxRetries ?? 3;
    const delayMs = options?.delayMs ?? 1000;

    return (async (...args: Parameters<T>) => {
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;

                if (attempt < maxRetries) {
                    options?.onRetry?.(attempt, error);
                    await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                }
            }
        }

        throw lastError;
    }) as T;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (!navigator.onLine) return true;

    const message = getErrorMessage(error).toLowerCase();
    return (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("timeout") ||
        message.includes("connection")
    );
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
    const code = getFirebaseErrorCode(error);
    if (code === "permission-denied") return true;

    const message = getErrorMessage(error).toLowerCase();
    return (
        message.includes("permission") ||
        message.includes("denied") ||
        message.includes("unauthorized")
    );
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
    const appError = toAppError(error);
    return appError.message;
}

/**
 * Create error boundary fallback component data
 */
export function createErrorBoundaryProps(error: unknown, resetError?: () => void) {
    const appError = toAppError(error);

    return {
        title: "Bir Hata Oluştu",
        message: appError.message,
        code: appError.code,
        canRetry: !isPermissionError(error),
        onRetry: resetError,
    };
}
