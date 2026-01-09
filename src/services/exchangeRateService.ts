/**
 * Exchange Rate Service
 * Döviz kurları için servis
 */

interface ExchangeRate {
  base: string; // TRY
  rates: {
    USD?: number;
    EUR?: number;
    GBP?: number;
    [key: string]: number | undefined;
  };
  date: string;
}

// Cache için
let cachedRates: ExchangeRate | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 saat

/**
 * Güncel döviz kurlarını al
 * ExchangeRate-API veya alternatif bir servis kullanılabilir
 */
export const getExchangeRates = async (): Promise<ExchangeRate> => {
  const now = Date.now();
  
  // Cache kontrolü
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    // ExchangeRate-API kullanıyoruz (ücretsiz)
    // Alternatif: https://api.exchangerate-api.com/v4/latest/TRY
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
    
    if (!response.ok) {
      throw new Error('Exchange rate API error');
    }

    const data = await response.json();
    
    // TRY bazlı kurları döndür
    cachedRates = {
      base: 'TRY',
      rates: {
        USD: data.rates?.USD ? 1 / data.rates.USD : undefined,
        EUR: data.rates?.EUR ? 1 / data.rates.EUR : undefined,
        GBP: data.rates?.GBP ? 1 / data.rates.GBP : undefined,
      },
      date: data.date || new Date().toISOString().split('T')[0],
    };
    
    cacheTimestamp = now;
    return cachedRates;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Exchange rate fetch error:', error);
    }
    
    // Fallback: Son bilinen kurlar veya varsayılan değerler
    if (cachedRates) {
      return cachedRates;
    }
    
    // Varsayılan kurlar (güncel değil, sadece fallback)
    return {
      base: 'TRY',
      rates: {
        USD: 0.034, // 1 USD = ~29 TRY
        EUR: 0.037, // 1 EUR = ~27 TRY
        GBP: 0.043, // 1 GBP = ~23 TRY
      },
      date: new Date().toISOString().split('T')[0],
    };
  }
};

/**
 * Para birimini TRY'ye çevir
 */
export const convertToTRY = async (
  amount: number,
  fromCurrency: string
): Promise<number> => {
  if (fromCurrency === 'TRY') {
    return amount;
  }

  const rates = await getExchangeRates();
  const rate = rates.rates[fromCurrency];
  
  if (!rate) {
    console.warn(`Exchange rate not found for ${fromCurrency}, using 1:1`);
    return amount;
  }

  // fromCurrency'dan TRY'ye çevir
  // Örnek: USD -> TRY: amount / rate (çünkü rate = TRY/USD)
  return amount / rate;
};

/**
 * TRY'yi başka bir para birimine çevir
 */
export const convertFromTRY = async (
  amount: number,
  toCurrency: string
): Promise<number> => {
  if (toCurrency === 'TRY') {
    return amount;
  }

  const rates = await getExchangeRates();
  const rate = rates.rates[toCurrency];
  
  if (!rate) {
    console.warn(`Exchange rate not found for ${toCurrency}, using 1:1`);
    return amount;
  }

  // TRY'den toCurrency'ye çevir
  return amount * rate;
};

/**
 * İki para birimi arasında çevir
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Önce TRY'ye çevir, sonra hedef para birimine
  const tryAmount = await convertToTRY(amount, fromCurrency);
  return await convertFromTRY(tryAmount, toCurrency);
};

